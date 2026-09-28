import { IsOptional, IsString } from 'class-validator';

export class AnalyticsQuery {
  @IsOptional() @IsString()
  sessionId?: string;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  sectionId?: string;

  @IsOptional() @IsString()
  subjectId?: string;
}
