import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQuery } from './dto/analytics.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics.view')
  getDashboard(@CurrentUser() actor: AuthenticatedUser) {
    if (actor.role === 'teacher') return this.service.getTeacherDashboard(actor.id);
    if (actor.role === 'student') return this.service.getStudentDashboard(actor.id);
    return this.service.getManagementDashboard();
  }

  @Get('health')
  @RequirePermissions('analytics.view')
  async getHealth() {
    try {
      await this.service['prisma'].$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() };
    }
  }
}
