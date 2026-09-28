import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportQuery } from './dto/report.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @RequirePermissions('reports.generate', 'analytics.view')
  generate(@Query() query: ReportQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.generateReport(query, { id: actor.id, role: actor.role });
  }
}
