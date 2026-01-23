import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
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
    @Body('userId') userId: string, // In real app, get from Auth Guard
  ) {
    if (!file) throw new Error('File upload failed');

    return this.jobsService.createJob({
      filename: file.originalname,
      path: file.path,
      material: material || 'PLA',
      userId: parseInt(userId) || 1, // Fallback to student ID 1 for demo
    });
  }
}
