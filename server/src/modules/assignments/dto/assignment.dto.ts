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

const SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED', 'RESUBMITTED'] as const;

// ──── Assignment CRUD ────

export class CreateAssignmentDto {
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
  dueDate?: string;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsBoolean()
  allowLate?: boolean;

  @IsOptional() @IsString()
  attachmentIds?: string;
}

export class UpdateAssignmentDto {
  @IsOptional() @IsString() @MinLength(1)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsBoolean()
  allowLate?: boolean;

  @IsOptional() @IsString()
  attachmentIds?: string;
}

export class ListAssignmentQuery extends PaginationDto {
  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString()
  search?: string;
}

// ──── Assignment Submissions ────

export class SubmitAssignmentDto {
  @IsOptional() @IsString()
  submissionText?: string;

  @IsOptional() @IsString()
  attachmentIds?: string;
}

export class GradeSubmissionDto {
  @IsOptional() @IsInt() @Min(0)
  marks?: number;

  @IsOptional() @IsString()
  grade?: string;

  @IsOptional() @IsString()
  feedback?: string;

  @IsOptional() @IsIn(SUBMISSION_STATUSES)
  status?: string;
}

export class ListSubmissionQuery extends PaginationDto {
  @IsOptional() @IsString()
  assignmentId?: string;

  @IsOptional() @IsString()
  studentId?: string;

  @IsOptional() @IsIn(SUBMISSION_STATUSES)
  status?: string;
}
