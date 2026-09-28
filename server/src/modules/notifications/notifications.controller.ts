import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { ListNotificationsQuery } from './dto/notification.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications.view')
  list(@Query() query: ListNotificationsQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.list(query, actor.id);
  }

  @Get('unread-count')
  @RequirePermissions('notifications.view')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getUnreadCount(actor.id);
  }

  @Post(':id/read')
  @RequirePermissions('notifications.view')
  markAsRead(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.markAsRead(id, actor.id);
  }

  @Post('read-all')
  @RequirePermissions('notifications.view')
  markAllAsRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.markAllAsRead(actor.id);
  }
}
