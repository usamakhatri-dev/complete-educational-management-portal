import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const AUDIENCES = ['ALL', 'CLASS', 'SECTION', 'STUDENTS', 'TEACHERS'] as const;
const ANNOUNCEMENT_TYPES = ['ANNOUNCEMENT', 'NOTICE'] as const;

export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional() @IsIn(ANNOUNCEMENT_TYPES)
  type?: string;

  @IsOptional() @IsIn(AUDIENCES)
  audience?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsOptional() @IsString()
  targetRole?: string;

  @IsOptional() @IsString()
  targetUserId?: string;

  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsBoolean()
  isPinned?: boolean;
}

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  content?: string;

  @IsOptional() @IsIn(ANNOUNCEMENT_TYPES)
  type?: string;

  @IsOptional() @IsIn(AUDIENCES)
  audience?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsOptional() @IsString()
  targetRole?: string;

  @IsOptional() @IsString()
  targetUserId?: string;

  @IsOptional() @IsDateString()
  expiresAt?: string;

  @IsOptional() @IsBoolean()
  isPinned?: boolean;
}

export class ListAnnouncementsQuery extends PaginationDto {
  @IsOptional() @IsIn(AUDIENCES)
  audience?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  search?: string;
}
