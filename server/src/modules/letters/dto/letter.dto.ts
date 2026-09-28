import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const LETTER_TYPES = ['LEAVE', 'COMPLAINT', 'APPEAL', 'CORRECTION_REQUEST', 'SUBJECT_CHANGE', 'GENERAL', 'SUGGESTION', 'DOCUMENT_UPLOAD'] as const;
const LETTER_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'] as const;
const LEAVE_TYPES = ['SICK', 'CASUAL', 'PERSONAL', 'EMERGENCY'] as const;

export class CreateLetterDto {
  @IsIn(LETTER_TYPES)
  type!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional() @IsDateString()
  leaveFrom?: string;

  @IsOptional() @IsDateString()
  leaveTo?: string;

  @IsOptional() @IsIn(LEAVE_TYPES)
  leaveType?: string;

  @IsOptional() @IsString()
  attachmentIds?: string;
}

export class ListLettersQuery extends PaginationDto {
  @IsOptional() @IsIn(LETTER_STATUSES)
  status?: string;

  @IsOptional() @IsIn(LETTER_TYPES)
  type?: string;

  @IsOptional() @IsString()
  studentId?: string;

  @IsOptional() @IsString()
  search?: string;
}

export class RespondLetterDto {
  @IsString()
  @MaxLength(5000)
  message!: string;

  @IsOptional() @IsIn(LETTER_STATUSES)
  status?: string;
}
