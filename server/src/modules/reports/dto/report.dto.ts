import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class ReportQuery extends PaginationDto {
  @IsOptional() @IsString()
  type?: string; // student | class | subject | attendance | summary

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

  @IsOptional() @IsString()
  search?: string;
}
