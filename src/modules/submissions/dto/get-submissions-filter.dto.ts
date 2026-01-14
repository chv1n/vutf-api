import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '../enum/submission-status.enum';
import { CourseType } from '../../inspection_round/entities/inspection_round.entity';


export class GetSubmissionsFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // คำค้นหา (รหัสโครงงาน, ชื่อไทย, ชื่ออังกฤษ)

  @IsOptional()
  round?: number; // รอบที่ตรวจ (inspection_round.round_number)

  @IsOptional()
  term?: string; // เทอม (inspection_round.term)

  @IsOptional()
  academicYear?: string; // ปีการศึกษา (inspection_round.academic_year)

  @IsOptional()
  @IsEnum(CourseType)
  courseType?: CourseType; // กรองตามประเภทวิชา

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus; // กรองตามสถานะ (สำหรับทำ Tabs)

  // --- Pagination ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}