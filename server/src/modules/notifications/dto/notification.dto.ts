import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class ListNotificationsQuery extends PaginationDto {
  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  search?: string;
}

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  link?: string;
}

export class CreateBulkNotificationDto {
  userIds!: string[];

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  link?: string;
}
