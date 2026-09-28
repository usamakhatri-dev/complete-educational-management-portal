import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AttendanceService } from './attendance.service.js';
import {
  CreateAttendanceDto,
  BulkCreateAttendanceDto,
  UpdateAttendanceDto,
  ListAttendanceQuery,
  AttendanceReportQuery,
} from './dto/attendance.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('attendance')
@Roles('super_admin', 'teacher', 'student')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ──── Overview ────

  @Get('overview')
  @RequirePermissions('attendance.view-own', 'attendance.view-all', 'attendance.take')
  getOverview(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getOverviewCounts({ id: actor.id, role: actor.role });
  }

  // ──── Mark single attendance ────

  @Post()
  @RequirePermissions('attendance.take')
  markAttendance(
    @Body() dto: CreateAttendanceDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.markAttendance(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Bulk mark attendance ────

  @Post('bulk')
  @RequirePermissions('attendance.take')
  bulkMarkAttendance(
    @Body() dto: BulkCreateAttendanceDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.bulkMarkAttendance(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── List attendance ────

  @Get()
  @RequirePermissions('attendance.view-own', 'attendance.view-all', 'attendance.take')
  listAttendance(
    @Query() query: ListAttendanceQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listAttendance(query, { id: actor.id, role: actor.role });
  }

  // ──── Get attendance by ID ────

  @Get(':id')
  @RequirePermissions('attendance.view-own', 'attendance.view-all', 'attendance.edit')
  getAttendanceById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getAttendanceById(id, { id: actor.id, role: actor.role });
  }

  // ──── Update attendance ────

  @Patch(':id')
  @RequirePermissions('attendance.edit')
  updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateAttendance(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Delete attendance ────

  @Delete(':id')
  @RequirePermissions('attendance.edit')
  deleteAttendance(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.deleteAttendance(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Reports ────

  @Get('reports/student/:studentId')
  @RequirePermissions('attendance.view-own', 'attendance.view-all', 'attendance.reports')
  getStudentSummary(
    @Param('studentId') studentId: string,
    @Query() query: AttendanceReportQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getStudentSummary(studentId, query, { id: actor.id, role: actor.role });
  }

  @Get('reports/class/:classId')
  @RequirePermissions('attendance.view-all', 'attendance.reports')
  getClassSummary(
    @Param('classId') classId: string,
    @Query() query: AttendanceReportQuery,
  ) {
    return this.service.getClassSummary(classId, query);
  }

  @Get('reports/subject/:classId')
  @RequirePermissions('attendance.view-all', 'attendance.reports')
  getSubjectAttendance(
    @Param('classId') classId: string,
    @Query() query: AttendanceReportQuery,
  ) {
    return this.service.getSubjectAttendance(classId, query);
  }
}
