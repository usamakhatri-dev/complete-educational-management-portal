import { Type } from 'class-transformer';
import {
  IsArray,
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

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY'] as const;

// ──── Single attendance record ────

export class CreateAttendanceDto {
  @IsString()
  @MinLength(1)
  classId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  period?: number;

  @IsIn(ATTENDANCE_STATUSES)
  status!: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  timetableSlotId?: string;
}

// ──── Bulk attendance ────

export class BulkAttendanceItemDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsIn(ATTENDANCE_STATUSES)
  status!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class BulkCreateAttendanceDto {
  @IsString()
  @MinLength(1)
  classId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  period?: number;

  @IsOptional()
  @IsString()
  timetableSlotId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  records!: BulkAttendanceItemDto[];
}

// ──── Update single attendance ────

export class UpdateAttendanceDto {
  @IsOptional()
  @IsIn(ATTENDANCE_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

// ──── List / Report queries ────

export class ListAttendanceQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

// ──── Reports query ────

export class AttendanceReportQuery {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
