import { Module } from '@nestjs/common';
import { BackupsService } from './backups.service.js';
import { BackupsController } from './backups.controller.js';

@Module({
  controllers: [BackupsController],
  providers: [BackupsService],
  exports: [BackupsService],
})
export class BackupsModule {}
