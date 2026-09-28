import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @MaxLength(100)
  key!: string;

  @IsString()
  value!: string;

  @IsOptional() @IsString()
  category?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100)
  fullName?: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString()
  avatarUrl?: string;

  @IsOptional() @IsString()
  currentPassword?: string;

  @IsOptional() @IsString()
  newPassword?: string;
}
