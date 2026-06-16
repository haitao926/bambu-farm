import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async createJob(data: {
    filename: string;
    path: string;
    material: string;
    userId: number;
    note?: string;
  }) {
    return this.prisma.job.create({
      data: {
        filename: data.filename,
        fileUrl: data.path,
        material: data.material,
        note: data.note || null,
        status: 'PENDING_REVIEW',
        user: {
          connect: { id: data.userId },
        },
      },
    });
  }

  async findAllMyJobs(userId: number) {
    return this.prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingReview() {
    return this.prisma.job.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findQueued() {
    return this.prisma.job.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { printer: true, activePrinter: true },
    });
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);
    return job;
  }

  async approveJob(id: string, reviewedById: number) {
    const job = await this.findOne(id);
    if (job.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Job status is ${job.status}, cannot approve`,
      );
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'QUEUED',
        reviewedAt: new Date(),
        reviewedById,
        queuedAt: new Date(),
      },
    });
  }

  async rejectJob(id: string, reviewedById: number, reason: string) {
    const job = await this.findOne(id);
    if (job.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Job status is ${job.status}, cannot reject`,
      );
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById,
        rejectionReason: reason,
      },
    });
  }

  async cancelJob(id: string) {
    const job = await this.findOne(id);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException(
        `Job is already in terminal state: ${job.status}`,
      );
    }

    // Use Prisma transaction to ensure atomic job cancellation and printer release
    return this.prisma.$transaction(async (tx) => {
      // If job is currently printing, release the printer first
      if (job.status === 'PRINTING' && job.activePrinterId) {
        await tx.printer.update({
          where: { id: job.activePrinterId },
          data: {
            status: 'IDLE',
            progress: 0,
            timeLeft: 0,
            currentFile: null,
          },
        });
      }

      return tx.job.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          activePrinterId: null,
        },
      });
    });
  }

  async confirmPickup(id: string) {
    const job = await this.findOne(id);
    if (job.status !== 'COMPLETED') {
      throw new BadRequestException(`Job is ${job.status}, not completed yet`);
    }
    return job;
  }

  async retryJob(id: string) {
    const job = await this.findOne(id);
    if (!['FAILED', 'CANCELLED', 'REJECTED'].includes(job.status)) {
      throw new BadRequestException(
        `Job is in status ${job.status}, cannot retry`,
      );
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'QUEUED',
        queuedAt: new Date(),
        startedAt: null,
        completedAt: null,
        failedAt: null,
        failureReason: null,
        activePrinterId: null,
      },
    });
  }
}
