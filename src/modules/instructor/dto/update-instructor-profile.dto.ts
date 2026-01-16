import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateInstructorProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}