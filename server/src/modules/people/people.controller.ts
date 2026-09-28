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
import { PeopleService } from './people.service.js';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  CreateStudentDto,
  UpdateStudentDto,
  ListPeopleQuery,
} from './dto/people.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('people')
@Roles('super_admin')
export class PeopleController {
  constructor(private readonly service: PeopleService) {}

  // ──────── Overview ────────

  @Get('overview')
  @RequirePermissions('teachers.manage')
  getOverview() {
    return this.service.getOverviewCounts();
  }

  // ──────── Teachers ────────

  @Post('teachers')
  @RequirePermissions('teachers.manage')
  createTeacher(
    @Body() dto: CreateTeacherDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createTeacher(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('teachers')
  @RequirePermissions('teachers.manage')
  listTeachers(@Query() query: ListPeopleQuery) {
    return this.service.listTeachers(query);
  }

  @Get('teachers/:id')
  @RequirePermissions('teachers.manage')
  findOneTeacher(@Param('id') id: string) {
    return this.service.findOneTeacher(id);
  }

  @Patch('teachers/:id')
  @RequirePermissions('teachers.manage')
  updateTeacher(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateTeacher(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('teachers/:id')
  @RequirePermissions('teachers.manage')
  removeTeacher(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeTeacher(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Students ────────

  @Post('students')
  @RequirePermissions('students.create')
  createStudent(
    @Body() dto: CreateStudentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createStudent(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('students')
  @RequirePermissions('students.list')
  listStudents(@Query() query: ListPeopleQuery) {
    return this.service.listStudents(query);
  }

  @Get('students/:id')
  @RequirePermissions('students.view')
  findOneStudent(@Param('id') id: string) {
    return this.service.findOneStudent(id);
  }

  @Patch('students/:id')
  @RequirePermissions('students.edit')
  updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateStudent(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('students/:id')
  @RequirePermissions('students.delete')
  removeStudent(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeStudent(id, { id: actor.id, role: actor.role, ip: req.ip });
  }
}
