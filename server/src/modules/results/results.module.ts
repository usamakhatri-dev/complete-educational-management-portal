import { Module } from '@nestjs/common';
import { ResultsService } from './results.service.js';
import { ResultsController } from './results.controller.js';

@Module({
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
