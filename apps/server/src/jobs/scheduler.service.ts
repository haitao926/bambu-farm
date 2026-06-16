import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterAdapter } from '../printer-adapters/printer-adapter.interface';
import { Printer, Job } from '@prisma/client';
import { PrinterTelemetrySnapshot } from '../printer-adapters/types';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly telemetrySubscriptions = new Map<
    number,
    () => Promise<void> | void
  >();

  constructor(
    private prisma: PrismaService,
    private printerAdapter: PrinterAdapter,
  ) {}

  onModuleInit() {
    this.logger.log('自动打印分发调度器已启动 (适配器+智能决策模式)...');
    this.schedulerInterval = setInterval(() => {
      void this.tick();
    }, 5000);
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    for (const unsubscribe of this.telemetrySubscriptions.values()) {
      void Promise.resolve(unsubscribe());
    }
    this.telemetrySubscriptions.clear();
  }

  /**
   * Helper function to match printers and jobs based on material and hardware configuration
   */
  private matchPrinterAndJob(printer: Printer, job: Job): boolean {
    const noteText = (job.note || '').toLowerCase();

    // 1. Nozzle Size Matching
    // If note mentions fine printing "0.2mm" or "0.2", it requires a 0.2mm nozzle.
    // Otherwise it defaults to 0.4mm nozzle.
    const requiresFineNozzle =
      noteText.includes('0.2mm') || noteText.includes('0.2');
    if (requiresFineNozzle && printer.nozzleSize !== 0.2) {
      return false;
    }
    if (!requiresFineNozzle && printer.nozzleSize !== 0.4) {
      return false;
    }

    // 2. Material & Enclosure Constraints
    // ABS/ASA require an enclosed printer (X1C or P1S) for heat retention and odor management
    const material = job.material.toUpperCase();
    if (['ABS', 'ASA'].includes(material)) {
      if (!['X1C', 'P1S'].includes(printer.model)) {
        this.logger.debug(
          `[调度匹配跳过] 任务 ${job.filename} 材料为 ${material}，需要封闭机型，但打印机 #${printer.id} 为开放式 ${printer.model}`,
        );
        return false;
      }
    }

    // TPU requires direct-drive direct-extrusion models. For school lab safety, only X1C and P1S are allowed.
    if (material === 'TPU') {
      if (!['X1C', 'P1S'].includes(printer.model)) {
        this.logger.debug(
          `[调度匹配跳过] 任务 ${job.filename} 材料为 TPU，学校仅支持在封闭直驱机型上打印，打印机 #${printer.id} 型号为 ${printer.model}`,
        );
        return false;
      }
    }

    return true;
  }

  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Temporary progress reconciliation fallback for already printing jobs.
      // Real liveness now comes from MQTT telemetry rather than simulated heartbeats.
      await this.prisma.$transaction(async (tx) => {
        const printingPrinters = await tx.printer.findMany({
          where: { status: 'PRINTING' },
        });

        for (const printer of printingPrinters) {
          if (this.telemetrySubscriptions.has(printer.id)) {
            continue;
          }

          const nextProgress =
            printer.progress + Math.floor(Math.random() * 5) + 3; // 3-7%
          if (nextProgress >= 100) {
            // Find active job
            const activeJob = await tx.job.findFirst({
              where: { status: 'PRINTING', activePrinterId: printer.id },
            });

            if (activeJob) {
              await tx.job.update({
                where: { id: activeJob.id },
                data: {
                  status: 'COMPLETED',
                  completedAt: new Date(),
                  activePrinterId: null,
                },
              });
              this.logger.log(
                `[完成] 任务 "${activeJob.filename}" (${activeJob.id}) 打印完成`,
              );
            }

            // Release printer
            await tx.printer.update({
              where: { id: printer.id },
              data: {
                status: 'IDLE',
                progress: 0,
                timeLeft: 0,
                currentFile: null,
                nozzleTemp: 25,
                bedTemp: 20,
              },
            });
            this.logger.log(`[释放] 打印机 #${printer.id} 打印完成并恢复空闲`);
          } else {
            const nextTimeLeft = Math.max(
              1,
              Math.round(
                printer.timeLeft -
                  (printer.timeLeft * (nextProgress - printer.progress)) / 100,
              ),
            );
            await tx.printer.update({
              where: { id: printer.id },
              data: {
                progress: nextProgress,
                timeLeft: nextTimeLeft,
                nozzleTemp: 220 + Math.floor(Math.sin(nextProgress / 5) * 3),
                bedTemp: 60,
              },
            });
          }
        }
      });

      // 2. Dispatch Queue with Heartbeat and Capability Filters
      // Stage 2.1: Find match and reserve in database transaction
      const heartbeatThreshold = new Date(Date.now() - 30 * 1000); // 30 seconds threshold

      const dispatchTarget = await this.prisma.$transaction(async (tx) => {
        // Fetch eligible online printers
        const idlePrinters = await tx.printer.findMany({
          where: {
            status: 'IDLE',
            lastSeenAt: { gte: heartbeatThreshold },
          },
          orderBy: { id: 'asc' },
        });

        // Fetch queued jobs
        const queuedJobs = await tx.job.findMany({
          where: { status: 'QUEUED' },
          orderBy: { queuedAt: 'asc' },
        });

        if (idlePrinters.length === 0 || queuedJobs.length === 0) return null;

        // Find matching pair
        let match = null;
        for (const job of queuedJobs) {
          for (const printer of idlePrinters) {
            if (this.matchPrinterAndJob(printer, job)) {
              match = { printer, job };
              break;
            }
          }
          if (match) break;
        }

        if (!match) return null;

        const { printer, job } = match;

        // Atomically reserve
        const reservedPrinter = await tx.printer.update({
          where: { id: printer.id },
          data: {
            status: 'DISPATCHING',
            currentFile: job.filename,
          },
        });

        const reservedJob = await tx.job.update({
          where: { id: job.id },
          data: {
            status: 'DISPATCHING',
            activePrinterId: printer.id,
            printerId: printer.id,
          },
        });

        return { printer: reservedPrinter, job: reservedJob };
      });

      // Stage 2.2: Async FTP / MQTT uploads outside db transaction
      if (dispatchTarget) {
        const { printer, job } = dispatchTarget;
        this.logger.log(
          `[匹配成功] 任务 "${job.filename}" (口径要求/材料: ${job.material}) -> 匹配打印机 #${printer.id} (${printer.model}, ${printer.nozzleSize}mm)`,
        );

        try {
          const deviceId = this.printerAdapter.resolveDeviceId(
            printer.serial,
            printer.ipAddress,
          );
          const remoteFilename = this.buildRemoteFilename(job.id, job.filename);

          // A. FTPS upload
          const remotePath = await this.printerAdapter.uploadFile(
            printer.ipAddress,
            printer.accessCode,
            deviceId,
            job.fileUrl,
            remoteFilename,
          );

          // B. MQTT start command
          await this.printerAdapter.startPrint(
            printer.ipAddress,
            printer.accessCode,
            deviceId,
            remotePath,
          );

          await this.ensureTelemetrySubscription(printer.id, {
            ip: printer.ipAddress,
            accessCode: printer.accessCode,
            deviceId,
          });

          // C. Commit Success
          await this.prisma.job.update({
            where: { id: job.id },
            data: {
              status: 'PRINTING',
              startedAt: new Date(),
              dispatchedAt: new Date(),
            },
          });

          await this.prisma.printer.update({
            where: { id: printer.id },
            data: {
              status: 'PRINTING',
              progress: 0,
              timeLeft: Math.floor(Math.random() * 40) + 20, // 20-60 minutes
              nozzleTemp: 220,
              bedTemp: 60,
            },
          });

          this.logger.log(
            `[分发完成] 任务 "${job.filename}" 已在打印机 #${printer.id} 上启动打印流程`,
          );
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `[分发异常] 打印机 #${printer.id} 通信故障: ${errMsg}。任务 "${job.filename}" 退回到失败状态并释放设备。`,
          );

          // D. Commit Failure / Rollback
          await this.prisma.$transaction(async (tx) => {
            await tx.printer.update({
              where: { id: printer.id },
              data: {
                status: 'IDLE',
                currentFile: null,
                progress: 0,
                timeLeft: 0,
                nozzleTemp: 25,
                bedTemp: 20,
              },
            });

            await tx.job.update({
              where: { id: job.id },
              data: {
                status: 'FAILED',
                activePrinterId: null,
                failedAt: new Date(),
                failureReason: `硬件下发中断: ${errMsg}`,
              },
            });
          });
        }
      }
    } catch (e) {
      this.logger.error('自动化调度服务 tick 执行异常', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private buildRemoteFilename(jobId: string, originalFilename: string): string {
    const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `job_${jobId}_${sanitized}`;
  }

  private async ensureTelemetrySubscription(
    printerId: number,
    connection: { ip: string; accessCode: string; deviceId: string },
  ) {
    if (this.telemetrySubscriptions.has(printerId)) return;

    const unsubscribe = await this.printerAdapter.subscribeTelemetry(
      connection.ip,
      connection.accessCode,
      connection.deviceId,
      (telemetry) => {
        void this.handleTelemetry(printerId, telemetry as PrinterTelemetrySnapshot);
      },
    );

    this.telemetrySubscriptions.set(printerId, unsubscribe);
  }

  private async handleTelemetry(
    printerId: number,
    telemetry: PrinterTelemetrySnapshot,
  ) {
    const status = this.mapTelemetryToPrinterStatus(telemetry);
    const currentFileValue =
      telemetry.currentFile == null || telemetry.currentFile === ''
        ? undefined
        : telemetry.currentFile;

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        lastSeenAt: new Date(),
        status,
        progress: telemetry.progress ?? undefined,
        timeLeft: telemetry.timeLeft ?? undefined,
        nozzleTemp: telemetry.nozzleTemp ?? undefined,
        bedTemp: telemetry.bedTemp ?? undefined,
        currentFile: currentFileValue,
      },
    });

    await this.reconcileJobStateFromTelemetry(printerId, telemetry, status);
  }

  private mapTelemetryToPrinterStatus(
    telemetry: PrinterTelemetrySnapshot,
  ): Printer['status'] {
    const gcodeState = (telemetry.gcodeState ?? '').toUpperCase();

    if (['RUNNING', 'PRINTING', 'PREPARE'].includes(gcodeState)) {
      return 'PRINTING';
    }
    if (['PAUSE', 'PAUSED'].includes(gcodeState)) {
      return 'PAUSED';
    }
    if (['FAILED', 'ERROR'].includes(gcodeState)) {
      return 'ERROR';
    }
    if (['IDLE', 'FINISH', 'COMPLETED'].includes(gcodeState)) {
      return 'IDLE';
    }
    return 'DISPATCHING';
  }

  private async reconcileJobStateFromTelemetry(
    printerId: number,
    telemetry: PrinterTelemetrySnapshot,
    printerStatus: Printer['status'],
  ) {
    const activeJob = await this.prisma.job.findFirst({
      where: {
        activePrinterId: printerId,
        status: { in: ['DISPATCHING', 'PRINTING'] },
      },
    });

    if (!activeJob) return;

    const gcodeState = (telemetry.gcodeState ?? '').toUpperCase();
    const errorCode =
      telemetry.errorCode == null ? null : String(telemetry.errorCode);

    if (printerStatus === 'ERROR' || errorCode === '1') {
      await this.prisma.$transaction(async (tx) => {
        await tx.job.update({
          where: { id: activeJob.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            activePrinterId: null,
            failureReason:
              telemetry.errorCode == null
                ? `打印机 #${printerId} 遥测报告错误状态`
                : `打印机 #${printerId} 遥测错误码: ${telemetry.errorCode}`,
          },
        });

        await tx.printer.update({
          where: { id: printerId },
          data: {
            status: 'ERROR',
          },
        });
      });
      return;
    }

    if (
      activeJob.status === 'DISPATCHING' &&
      printerStatus === 'PRINTING'
    ) {
      await this.prisma.job.update({
        where: { id: activeJob.id },
        data: {
          status: 'PRINTING',
          startedAt: activeJob.startedAt ?? new Date(),
          dispatchedAt: activeJob.dispatchedAt ?? new Date(),
        },
      });
      return;
    }

    if (
      ['FINISH', 'COMPLETED', 'IDLE'].includes(gcodeState) &&
      (telemetry.progress ?? 0) >= 95
    ) {
      await this.prisma.$transaction(async (tx) => {
        await tx.job.update({
          where: { id: activeJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            activePrinterId: null,
          },
        });

        await tx.printer.update({
          where: { id: printerId },
          data: {
            status: 'IDLE',
            progress: 100,
            timeLeft: 0,
            currentFile: null,
          },
        });
      });
    }
  }
}
