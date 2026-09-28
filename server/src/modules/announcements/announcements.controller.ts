import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service.js';
import { CreateAnnouncementDto, UpdateAnnouncementDto, ListAnnouncementsQuery } from './dto/announcement.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Post()
  @RequirePermissions('announcements.manage')
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, { id: actor.id, role: actor.role, ip: '' });
  }

  @Get()
  @RequirePermissions('announcements.view')
  list(@Query() query: ListAnnouncementsQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.list(query, { id: actor.id, role: actor.role });
  }

  @Get(':id')
  @RequirePermissions('announcements.view')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Put(':id')
  @RequirePermissions('announcements.manage')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.update(id, dto, { id: actor.id, role: actor.role, ip: '' });
  }

  @Delete(':id')
  @RequirePermissions('announcements.manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.remove(id, { id: actor.id, role: actor.role, ip: '' });
  }
}
