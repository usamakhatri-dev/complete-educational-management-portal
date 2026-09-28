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

const EXAM_TYPES = ['UNIT_TEST', 'MONTHLY_TEST', 'MID_TERM', 'FINAL', 'PRACTICAL', 'ASSIGNMENT', 'PROJECT', 'ONLINE_TEST', 'OFFLINE_TEST'] as const;
const GRADING_MODES = ['PERCENTAGE', 'GRADE', 'GPA'] as const;
const RESULT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED'] as const;

// ──── Exam CRUD ────

export class CreateExamDto {
  @IsString() @MinLength(1)
  name!: string;

  @IsIn(EXAM_TYPES)
  type!: string;

  @IsString() @MinLength(1)
  sessionId!: string;

  @IsString() @MinLength(1)
  classId!: string;

  @IsString() @MinLength(1)
  subjectId!: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsInt() @Min(0)
  passMarks?: number;

  @IsOptional() @IsInt() @Min(1)
  weight?: number;

  @IsOptional() @IsIn(GRADING_MODES)
  gradingMode?: string;
}

export class UpdateExamDto {
  @IsOptional() @IsString() @MinLength(1)
  name?: string;

  @IsOptional() @IsIn(EXAM_TYPES)
  type?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsInt() @Min(1)
  totalMarks?: number;

  @IsOptional() @IsInt() @Min(0)
  passMarks?: number;

  @IsOptional() @IsInt() @Min(1)
  weight?: number;

  @IsOptional() @IsIn(GRADING_MODES)
  gradingMode?: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

export class ListExamQuery extends PaginationDto {
  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString()
  sessionId?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  search?: string;
}

// ──── Exam Results ────

export class EnterResultDto {
  @IsString() @MinLength(1)
  studentId!: string;

  @IsOptional() @IsInt() @Min(0)
  marksObtained?: number;

  @IsOptional() @IsString()
  grade?: string;

  @IsOptional() @IsString()
  remark?: string;
}

export class BulkEnterResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnterResultDto)
  results!: EnterResultDto[];
}

export class UpdateResultDto {
  @IsOptional() @IsInt() @Min(0)
  marksObtained?: number;

  @IsOptional() @IsString()
  grade?: string;

  @IsOptional() @IsString()
  remark?: string;

  @IsOptional() @IsIn(RESULT_STATUSES)
  status?: string;
}

export class ListResultQuery extends PaginationDto {
  @IsOptional() @IsString()
  examId?: string;

  @IsOptional() @IsString()
  studentId?: string;

  @IsOptional() @IsIn(RESULT_STATUSES)
  status?: string;
}
