import { Module } from '@nestjs/common';
import { PeopleService } from './people.service.js';
import { PeopleController } from './people.controller.js';

@Module({
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
