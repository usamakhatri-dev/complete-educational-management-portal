import { Module } from '@nestjs/common';
import { LettersService } from './letters.service.js';
import { LettersController } from './letters.controller.js';

@Module({
  controllers: [LettersController],
  providers: [LettersService],
  exports: [LettersService],
})
export class LettersModule {}
