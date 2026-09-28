import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';
import { TimetableController } from './timetable.controller.js';

@Module({
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
