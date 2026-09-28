import { Module } from '@nestjs/common';
import { AcademicsService } from './academics.service.js';
import { AcademicsController } from './academics.controller.js';
import { TeacherAcademicsController } from './teacher-academics.controller.js';

@Module({
  controllers: [AcademicsController, TeacherAcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}
