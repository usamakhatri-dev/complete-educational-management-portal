import { IsOptional, IsString } from 'class-validator';

export class CreateBackupDto {
  @IsOptional() @IsString()
  type?: string;
}

export class DeleteBackupDto {
  @IsString()
  id!: string;
}
