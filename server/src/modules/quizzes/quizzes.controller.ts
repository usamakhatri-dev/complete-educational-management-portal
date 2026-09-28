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
import { QuizzesService } from './quizzes.service.js';
import {
  CreateQuizDto,
  UpdateQuizDto,
  ListQuizQuery,
  SubmitQuizDto,
  GradeSubmissionDto,
  ListSubmissionQuery,
} from './dto/quiz.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('quizzes')
@Roles('super_admin', 'teacher', 'student')
export class QuizzesController {
  constructor(private readonly service: QuizzesService) {}

  @Post()
  @RequirePermissions('quizzes.manage')
  createQuiz(
    @Body() dto: CreateQuizDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createQuiz(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get()
  @RequirePermissions('quizzes.manage', 'quizzes.attempt')
  listQuizzes(
    @Query() query: ListQuizQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listQuizzes(query, { id: actor.id, role: actor.role });
  }

  @Get(':id')
  @RequirePermissions('quizzes.manage', 'quizzes.attempt')
  getQuizById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getQuizById(id, { id: actor.id, role: actor.role });
  }

  @Patch(':id')
  @RequirePermissions('quizzes.manage')
  updateQuiz(
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateQuiz(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete(':id')
  @RequirePermissions('quizzes.manage')
  deleteQuiz(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.deleteQuiz(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──── Submissions ────

  @Post(':id/submit')
  @RequirePermissions('quizzes.attempt')
  submitQuiz(
    @Param('id') id: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.submitQuiz(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('submissions/all')
  @RequirePermissions('quizzes.manage', 'quizzes.grade')
  listSubmissions(
    @Query() query: ListSubmissionQuery,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listSubmissions(query, { id: actor.id, role: actor.role });
  }

  @Patch('submissions/:id/grade')
  @RequirePermissions('quizzes.grade')
  gradeSubmission(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.gradeSubmission(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }
}
