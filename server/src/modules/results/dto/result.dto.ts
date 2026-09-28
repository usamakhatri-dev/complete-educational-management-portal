import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const RESULT_STATUS = ['DRAFT', 'PUBLISHED', 'FINALIZED'] as const;

export class ListResultsQuery extends PaginationDto {
  @IsOptional() @IsString()
  sessionId?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString()
  studentId?: string;

  @IsOptional() @IsIn(RESULT_STATUS)
  status?: string;

  @IsOptional() @IsString()
  search?: string;
}

export class StudentResultQuery {
  @IsString()
  studentId!: string;

  @IsOptional() @IsString()
  sessionId?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  subjectId?: string;
}

export class ClassResultsQuery {
  @IsString()
  classId!: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString()
  sessionId?: string;
}

export class SubjectResultsQuery {
  @IsString()
  subjectId!: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  sessionId?: string;
}

export class PublishResultsDto {
  @IsOptional() @IsDateString()
  sessionEnd?: string;
}
