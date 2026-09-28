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
import { AcademicsService } from './academics.service.js';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateSessionDto,
  UpdateSessionDto,
  CreateClassDto,
  UpdateClassDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  ListAcademicQuery,
} from './dto/academic.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('academics')
@Roles('super_admin')
export class AcademicsController {
  constructor(private readonly service: AcademicsService) {}

  // ──────── Overview ────────

  @Get('overview')
  @RequirePermissions('academic.view')
  getOverview() {
    return this.service.getOverviewCounts();
  }

  // ──────── Departments ────────

  @Post('departments')
  @RequirePermissions('academic.manage')
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createDepartment(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('departments')
  @RequirePermissions('academic.view')
  listDepartments(@Query() query: ListAcademicQuery) {
    return this.service.listDepartments(query);
  }

  @Get('departments/:id')
  @RequirePermissions('academic.view')
  findOneDepartment(@Param('id') id: string) {
    return this.service.findOneDepartment(id);
  }

  @Patch('departments/:id')
  @RequirePermissions('academic.manage')
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateDepartment(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('departments/:id')
  @RequirePermissions('academic.manage')
  removeDepartment(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeDepartment(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Sessions ────────

  @Post('sessions')
  @RequirePermissions('academic.manage')
  createSession(
    @Body() dto: CreateSessionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createSession(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('sessions')
  @RequirePermissions('academic.view')
  listSessions(@Query() query: ListAcademicQuery) {
    return this.service.listSessions(query);
  }

  @Get('sessions/:id')
  @RequirePermissions('academic.view')
  findOneSession(@Param('id') id: string) {
    return this.service.findOneSession(id);
  }

  @Patch('sessions/:id')
  @RequirePermissions('academic.manage')
  updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateSession(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('sessions/:id')
  @RequirePermissions('academic.manage')
  removeSession(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeSession(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Classes ────────

  @Post('classes')
  @RequirePermissions('academic.manage')
  createClass(
    @Body() dto: CreateClassDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createClass(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('classes')
  @RequirePermissions('academic.view')
  listClasses(@Query() query: ListAcademicQuery) {
    return this.service.listClasses(query);
  }

  @Get('classes/:id')
  @RequirePermissions('academic.view')
  findOneClass(@Param('id') id: string) {
    return this.service.findOneClass(id);
  }

  @Patch('classes/:id')
  @RequirePermissions('academic.manage')
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateClass(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('classes/:id')
  @RequirePermissions('academic.manage')
  removeClass(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeClass(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Sections ────────

  @Post('sections')
  @RequirePermissions('academic.manage')
  createSection(
    @Body() dto: CreateSectionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createSection(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('sections')
  @RequirePermissions('academic.view')
  listSections(@Query() query: ListAcademicQuery) {
    return this.service.listSections(query);
  }

  @Get('sections/:id')
  @RequirePermissions('academic.view')
  findOneSection(@Param('id') id: string) {
    return this.service.findOneSection(id);
  }

  @Patch('sections/:id')
  @RequirePermissions('academic.manage')
  updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateSection(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('sections/:id')
  @RequirePermissions('academic.manage')
  removeSection(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeSection(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Subjects ────────

  @Post('subjects')
  @RequirePermissions('academic.manage')
  createSubject(
    @Body() dto: CreateSubjectDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createSubject(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('subjects')
  @RequirePermissions('academic.view')
  listSubjects(@Query() query: ListAcademicQuery) {
    return this.service.listSubjects(query);
  }

  @Get('subjects/:id')
  @RequirePermissions('academic.view')
  findOneSubject(@Param('id') id: string) {
    return this.service.findOneSubject(id);
  }

  @Patch('subjects/:id')
  @RequirePermissions('academic.manage')
  updateSubject(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateSubject(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('subjects/:id')
  @RequirePermissions('academic.manage')
  removeSubject(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeSubject(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── ClassSubjects ────────

  @Get('classes/:classId/sections')
  @RequirePermissions('academic.view')
  getSectionsByClass(@Param('classId') classId: string) {
    return this.service.getSectionsByClass(classId);
  }

  @Get('classes/:classId/subjects')
  @RequirePermissions('academic.view')
  getSubjectsByClass(@Param('classId') classId: string) {
    return this.service.getSubjectsByClass(classId);
  }

  @Get('class-subjects')
  @RequirePermissions('academic.view')
  getClassSubjects(@Query('classId') classId?: string) {
    return this.service.getClassSubjects(classId);
  }

  @Post('classes/:classId/subjects/:subjectId/assign/:teacherId')
  @RequirePermissions('academic.manage')
  assignSubjectToClass(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Param('teacherId') teacherId: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.assignSubjectToClass(classId, subjectId, teacherId, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }

  @Delete('classes/:classId/subjects/:subjectId')
  @RequirePermissions('academic.manage')
  removeSubjectFromClass(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeSubjectFromClass(classId, subjectId, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }
}
