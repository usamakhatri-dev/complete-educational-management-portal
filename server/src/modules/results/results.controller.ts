import { Controller, Get, Query } from '@nestjs/common';
import { ResultsService } from './results.service.js';
import {
  ListResultsQuery,
  StudentResultQuery,
  ClassResultsQuery,
  SubjectResultsQuery,
} from './dto/result.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('results')
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  @Get('overview')
  @RequirePermissions('results.view', 'exams.view')
  getOverview(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getOverviewStats({ id: actor.id, role: actor.role });
  }

  @Get('grade-scale')
  @RequirePermissions('results.view', 'exams.view')
  getGradeScale() {
    return this.service.getGradeScale();
  }

  @Get()
  @RequirePermissions('results.view', 'exams.view', 'exams.enter-marks')
  listResults(@Query() query: ListResultsQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listResults(query, { id: actor.id, role: actor.role });
  }

  @Get('student')
  @RequirePermissions('results.view', 'exams.view', 'students.view-own')
  getStudentResult(@Query() query: StudentResultQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getStudentResult(query, { id: actor.id, role: actor.role });
  }

  @Get('class')
  @RequirePermissions('results.view', 'exams.view', 'exams.manage')
  getClassResults(@Query() query: ClassResultsQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getClassResults(query, { id: actor.id, role: actor.role });
  }

  @Get('subject')
  @RequirePermissions('results.view', 'exams.view', 'exams.manage')
  getSubjectResults(@Query() query: SubjectResultsQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getSubjectResults(query, { id: actor.id, role: actor.role });
  }
}
