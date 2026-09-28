import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AcademicsService } from './academics.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('teacher-academics')
export class TeacherAcademicsController {
  constructor(private readonly service: AcademicsService) {}

  @Get('my-class-subjects')
  @RequirePermissions('academic.view')
  getMyClassSubjects(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getTeacherClassSubjects(actor.id);
  }
}
