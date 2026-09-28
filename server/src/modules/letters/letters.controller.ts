import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { LettersService } from './letters.service.js';
import { CreateLetterDto, ListLettersQuery, RespondLetterDto } from './dto/letter.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('letters')
export class LettersController {
  constructor(private readonly service: LettersService) {}

  @Post()
  @RequirePermissions('letters.submit')
  create(@Body() dto: CreateLetterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.createLetter(dto, { id: actor.id, role: actor.role, ip: '' });
  }

  @Get()
  @RequirePermissions('letters.submit', 'letters.manage', 'letters.reply')
  list(@Query() query: ListLettersQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listLetters(query, { id: actor.id, role: actor.role });
  }

  @Get(':id')
  @RequirePermissions('letters.submit', 'letters.manage', 'letters.reply')
  getOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getLetter(id, { id: actor.id, role: actor.role });
  }

  @Post(':id/respond')
  @RequirePermissions('letters.reply', 'letters.manage', 'letters.approve-leave')
  respond(@Param('id') id: string, @Body() dto: RespondLetterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.respondToLetter(id, dto, { id: actor.id, role: actor.role, ip: '' });
  }
}
