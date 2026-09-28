import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED', 'TIMED_OUT'] as const;

// ──── Quiz CRUD ────

export class CreateQuizDto {
  @IsString() @MinLength(1)
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsString() @MinLength(1)
  classId!: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsString() @MinLength(1)
  subjectId!: string;

  @IsOptional() @IsDateString()
  startAt?: string;

  @IsOptional() @IsInt() @Min(1) @Max(300)
  durationMinutes?: number;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsInt() @Min(0)
  passMarks?: number;

  @IsString() @MinLength(2)
  questionsJson!: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  shuffleQuestions?: boolean;
}

export class UpdateQuizDto {
  @IsOptional() @IsString() @MinLength(1)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsDateString()
  startAt?: string;

  @IsOptional() @IsInt() @Min(1) @Max(300)
  durationMinutes?: number;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsInt() @Min(0)
  passMarks?: number;

  @IsOptional() @IsString()
  questionsJson?: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  shuffleQuestions?: boolean;
}

export class ListQuizQuery extends PaginationDto {
  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString()
  search?: string;
}

// ──── Quiz Submissions ────

export class SubmitQuizDto {
  @IsString() @MinLength(1)
  answersJson!: string;
}

export class GradeSubmissionDto {
  @IsOptional() @IsInt() @Min(0)
  score?: number;

  @IsOptional() @IsIn(SUBMISSION_STATUSES)
  status?: string;
}

export class ListSubmissionQuery extends PaginationDto {
  @IsOptional() @IsString()
  quizId?: string;

  @IsOptional() @IsString()
  studentId?: string;

  @IsOptional() @IsIn(SUBMISSION_STATUSES)
  status?: string;
}
