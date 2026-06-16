import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array.from(Array(32))
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(3mf|gcode)$/)) {
          return cb(
            new Error('Only .3mf and .gcode files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('material') material: string,
    @Body('userId') userId: string,
    @Body('note') note?: string,
  ) {
    if (!file) throw new BadRequestException('File upload failed');

    const filenameUtf8 = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    return this.jobsService.createJob({
      filename: filenameUtf8,
      path: file.path,
      material: material || 'PLA',
      userId: parseInt(userId) || 2, // Default to student ID 2 (Student A)
      note,
    });
  }

  @Get('my')
  async getMyJobs(@Query('userId') userId: string) {
    const id = parseInt(userId) || 2; // Default to Student A
    return this.jobsService.findAllMyJobs(id);
  }

  @Get('review')
  async getPendingReview() {
    return this.jobsService.findPendingReview();
  }

  @Get('queue')
  async getQueue() {
    return this.jobsService.findQueued();
  }

  @Get(':id')
  async getJobDetails(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('reviewedById') reviewedById?: number,
  ) {
    return this.jobsService.approveJob(id, reviewedById || 1); // Default to Mr. Wang (ID 1)
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('reviewedById') reviewedById?: number,
  ) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    return this.jobsService.rejectJob(id, reviewedById || 1, reason);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.jobsService.cancelJob(id);
  }

  @Post(':id/confirm-pickup')
  async confirmPickup(@Param('id') id: string) {
    return this.jobsService.confirmPickup(id);
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    return this.jobsService.retryJob(id);
  }
}
