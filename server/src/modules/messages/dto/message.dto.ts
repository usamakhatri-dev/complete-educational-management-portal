import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class SendMessageDto {
  @IsString()
  recipientId!: string;

  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MaxLength(5000)
  body!: string;
}

export class ListMessagesQuery extends PaginationDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  folder?: string; // inbox | sent
}
