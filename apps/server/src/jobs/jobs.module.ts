import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SchedulerService } from './scheduler.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, SchedulerService],
})
export class JobsModule {}
