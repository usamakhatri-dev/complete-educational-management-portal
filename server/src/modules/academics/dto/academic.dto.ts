import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

// ──────── Departments ────────

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  headTeacherId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  headTeacherId?: string;
}

// ──────── Sessions ────────

export class CreateSessionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ──────── Classes ────────

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  classTeacherId?: string;

  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  classTeacherId?: string;

  @IsOptional()
  @IsString()
  room?: string;
}

// ──────── Sections ────────

export class CreateSectionDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  classId: string;

  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  room?: string;
}

// ──────── Subjects ────────

export class CreateSubjectDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsBoolean()
  isElective?: boolean;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsBoolean()
  isElective?: boolean;
}

// ──────── Query DTOs ────────

export class ListAcademicQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}
