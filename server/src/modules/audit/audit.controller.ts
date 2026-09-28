import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ActivityLogQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

class LoginHistoryQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Boolean)
  success?: boolean;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('activity-logs')
  @RequirePermissions('audit.view')
  listActivityLogs(@Query() query: ActivityLogQuery) {
    return this.auditService.listActivityLogs(query);
  }

  @Get('login-history')
  @RequirePermissions('login-history.view')
  listLoginHistory(@Query() query: LoginHistoryQuery) {
    return this.auditService.listLoginHistory(query);
  }
}
