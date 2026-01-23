import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async createJob(data: {
    filename: string;
    path: string;
    material: string;
    userId: number;
  }) {
    // 1. Create Job Record
    const job = await this.prisma.job.create({
      data: {
        filename: data.filename,
        fileUrl: data.path,
        material: data.material,
        status: 'PENDING',
        user: {
          connect: { id: data.userId },
        },
      },
    });

    // 2. (Mock) Auto-assign to an idle printer if available
    // In real system, this would be a separate Queue Processor
    await this.tryAssignJob(job.id);

    return job;
  }

  private async tryAssignJob(jobId: string) {
    // Find an idle printer
    const printer = await this.prisma.printer.findFirst({
      where: { status: 'IDLE' },
    });

    if (printer) {
      // Update Printer Status
      await this.prisma.printer.update({
        where: { id: printer.id },
        data: {
          status: 'PRINTING',
          currentFile: 'Allocating...',
          progress: 0,
          timeLeft: 60, // Mock estimated time
        },
      });

      // Update Job Status
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'PRINTING',
          activePrinterId: printer.id,
          startedAt: new Date(),
        },
      });

      console.log(`[Scheduler] Assigned Job ${jobId} to Printer ${printer.id}`);
    } else {
      console.log(`[Scheduler] No idle printers for Job ${jobId}. Queued.`);
    }
  }
}
