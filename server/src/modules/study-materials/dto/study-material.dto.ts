import { IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateStudyMaterialDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  classId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateStudyMaterialDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ListStudyMaterialQuery {
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
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
