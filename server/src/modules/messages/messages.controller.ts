import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { SendMessageDto, ListMessagesQuery } from './dto/message.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Post()
  @RequirePermissions('messages.send')
  send(@Body() dto: SendMessageDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.send(dto, actor.id);
  }

  @Get('inbox')
  @RequirePermissions('messages.view')
  inbox(@Query() query: ListMessagesQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listInbox(query, actor.id);
  }

  @Get('sent')
  @RequirePermissions('messages.view')
  sent(@Query() query: ListMessagesQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listSent(query, actor.id);
  }

  @Get('unread-count')
  @RequirePermissions('messages.view')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getUnreadCount(actor.id);
  }

  @Get(':id')
  @RequirePermissions('messages.view')
  getOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getMessage(id, actor.id);
  }

  @Post(':id/read')
  @RequirePermissions('messages.view')
  markAsRead(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.markAsRead(id, actor.id);
  }
}
