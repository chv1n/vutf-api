// src/modules/report-file/dto/get-reports-filter.dto.ts
import { IsOptional, IsString, IsNumber, Min, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationResultStatus, InstructorReviewStatus } from '../enum/report-status.enum';

export class GetReportsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  inspectionId?: number;

  @IsOptional()
  @IsString()
  search?: string; // Search by thesis name, student name

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  submissionId?: number; // Filter by specific submission

  @IsOptional()
  @IsString()
  round?: string; // เช่น '1', '2'

  @IsOptional()
  @IsString()
  term?: string; // เช่น '1', '2'

  @IsOptional()
  @IsString()
  academicYear?: string; // เช่น '2567'

  @IsOptional()
  @IsString()
  courseType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(VerificationResultStatus)
  verificationStatus?: VerificationResultStatus;

  @IsOptional()
  @IsEnum(InstructorReviewStatus)
  reviewStatus?: InstructorReviewStatus;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}