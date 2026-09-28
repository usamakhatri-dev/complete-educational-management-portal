import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ROLES = ['super_admin', 'teacher', 'student'] as const;

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export class TeacherProfileDto {
  @IsString()
  employeeCode: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;
}

export class StudentProfileDto {
  @IsString()
  rollNumber: string;

  @IsString()
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
}

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(PASSWORD_RULE, {
    message:
      'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TeacherProfileDto)
  teacher?: TeacherProfileDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StudentProfileDto)
  student?: StudentProfileDto;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  @Matches(PASSWORD_RULE, {
    message:
      'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  newPassword?: string;
}
