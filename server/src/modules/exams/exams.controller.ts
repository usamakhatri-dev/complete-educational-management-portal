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
import { ExamsService } from './exams.service.js';
import {
  CreateExamDto,
  UpdateExamDto,
  ListExamQuery,
  BulkEnterResultsDto,
  UpdateResultDto,
  ListResultQuery,
} from './dto/exam.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('exams')
@Roles('super_admin', 'teacher', 'student')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  @Get('overview')
  @RequirePermissions('exams.view', 'exams.manage')
  getOverview(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getOverviewCounts({ id: actor.id, role: actor.role });
  }

  @Post()
  @RequirePermissions('exams.manage')
  createExam(
    @Body() dto: CreateExamDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createExam(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get()
  @RequirePermissions('exams.view', 'exams.manage')
  listExams(
    @Query() query: ListExamQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listExams(query, { id: actor.id, role: actor.role });
  }

  @Get(':id')
  @RequirePermissions('exams.view', 'exams.manage')
  getExamById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getExamById(id, { id: actor.id, role: actor.role });
  }

  @Patch(':id')
  @RequirePermissions('exams.manage')
  updateExam(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateExam(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete(':id')
  @RequirePermissions('exams.manage')
  deleteExam(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.deleteExam(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Results ────

  @Get(':id/results')
  @RequirePermissions('exams.view', 'exams.enter-marks', 'results.view')
  listResults(
    @Query() query: ListResultQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listResults(query, { id: actor.id, role: actor.role });
  }

  @Get(':id/stats')
  @RequirePermissions('exams.view', 'exams.manage')
  getExamStats(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getExamStats(id, { id: actor.id, role: actor.role });
  }

  @Post(':id/results')
  @RequirePermissions('exams.enter-marks')
  enterResults(
    @Param('id') id: string,
    @Body() dto: BulkEnterResultsDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.enterResults(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Patch('results/:resultId')
  @RequirePermissions('exams.enter-marks', 'exams.approve')
  updateResult(
    @Param('resultId') resultId: string,
    @Body() dto: UpdateResultDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateResult(resultId, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Post(':id/publish')
  @RequirePermissions('exams.publish')
  publishResults(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.publishResults(id, { id: actor.id, role: actor.role, ip: req.ip });
  }
}
