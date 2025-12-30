import { IsNotEmpty, IsString, IsDateString, IsOptional, IsEnum, IsInt, IsBoolean, Min, Length } from 'class-validator';
import { CourseType, InspectionStatus } from '../entities/inspection_round.entity';

export class CreateInspectionRoundDto {
  @IsNotEmpty({ message: 'กรุณาระบุปีการศึกษา' })
  @IsString()
  @Length(4, 4, { message: 'ปีการศึกษาต้องมี 4 หลัก (เช่น 2567)' })
  academicYear: string;

  @IsNotEmpty({ message: 'กรุณาระบุเทอม' })
  @IsString()
  term: string;

  @IsNotEmpty({ message: 'กรุณาระบุลำดับรอบ' })
  @IsInt()
  @Min(1, { message: 'ลำดับรอบต้องเริ่มจาก 1' })
  roundNumber: number;

  @IsNotEmpty({ message: 'กรุณาระบุประเภทโครงงาน' })
  @IsEnum(CourseType, { message: 'ประเภทโครงงานไม่ถูกต้อง (PRE_PROJECT, PROJECT, ALL)' })
  courseType: CourseType;

  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString()
  startDate: string; // รับเป็น String (ISO8601)

  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(InspectionStatus) 
  status?: InspectionStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}