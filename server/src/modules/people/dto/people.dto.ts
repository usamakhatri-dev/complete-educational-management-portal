import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

// ──────── Teachers ────────

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(3)
  employeeCode: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  phone?: string;
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  employeeCode?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  isActive?: boolean;
}

// ──────── Students ────────

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(3)
  rollNumber: string;

  @IsString()
  @MinLength(3)
  admissionNumber: string;

  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  phone?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  rollNumber?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED', 'DROPPED'])
  status?: string;
}

// ──────── Query ────────

export class ListPeopleQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED', 'DROPPED'])
  status?: string;
}
