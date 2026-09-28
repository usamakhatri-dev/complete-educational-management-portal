import { Module } from '@nestjs/common';
import { StudyMaterialsController } from './study-materials.controller.js';
import { StudyMaterialsService } from './study-materials.service.js';

@Module({
  controllers: [StudyMaterialsController],
  providers: [StudyMaterialsService],
  exports: [StudyMaterialsService],
})
export class StudyMaterialsModule {}
