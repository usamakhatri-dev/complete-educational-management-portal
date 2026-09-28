import { Type } from 'class-transformer';
import {
  IsArray,
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

// ──────── Single Slot ────────

export class CreateTimetableSlotDto {
  @IsString()
  @MinLength(1)
  classSubjectId: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt()
  @Min(1)
  @Max(10)
  period: number;

  @IsString()
  @MinLength(1)
  startTime: string;

  @IsString()
  @MinLength(1)
  endTime: string;

  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  period?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  room?: string;
}

// ──────── Bulk Create ────────

export class BulkCreateSlotDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimetableSlotDto)
  slots: CreateTimetableSlotDto[];
}

// ──────── Query DTOs ────────

export class ListTimetableQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;
}
