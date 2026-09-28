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
import { AssignmentsService } from './assignments.service.js';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  ListAssignmentQuery,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ListSubmissionQuery,
} from './dto/assignment.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('assignments')
@Roles('super_admin', 'teacher', 'student')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post()
  @RequirePermissions('assignments.manage')
  createAssignment(
    @Body() dto: CreateAssignmentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createAssignment(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get()
  @RequirePermissions('assignments.manage', 'assignments.submit')
  listAssignments(
    @Query() query: ListAssignmentQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listAssignments(query, { id: actor.id, role: actor.role });
  }

  @Get(':id')
  @RequirePermissions('assignments.manage', 'assignments.submit')
  getAssignmentById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getAssignmentById(id, { id: actor.id, role: actor.role });
  }

  @Patch(':id')
  @RequirePermissions('assignments.manage')
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateAssignment(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete(':id')
  @RequirePermissions('assignments.manage')
  deleteAssignment(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.deleteAssignment(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Submissions ────

  @Post(':id/submit')
  @RequirePermissions('assignments.submit')
  submitAssignment(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.submitAssignment(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('submissions/all')
  @RequirePermissions('assignments.manage', 'assignments.grade')
  listSubmissions(
    @Query() query: ListSubmissionQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listSubmissions(query, { id: actor.id, role: actor.role });
  }

  @Patch('submissions/:id/grade')
  @RequirePermissions('assignments.grade')
  gradeSubmission(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.gradeSubmission(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }
}
