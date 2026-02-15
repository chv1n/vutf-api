// src/modules/thesis-topic/dto/get-groups-filter.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ThesisGroupStatus } from '../../thesis-group/entities/thesis-group.entity';
import { ThesisStatus } from '../../thesis/enums/course-type.enum';

export class GetGroupsFilterDto {
  @IsOptional()
  @IsString()
  keyword?: string; // ค้นหา: ชื่อวิทยานิพนธ์ (TH/EN), รหัสวิทยานิพนธ์, ชื่อ นศ., รหัส นศ.

  @IsOptional()
  @IsEnum(ThesisGroupStatus)
  group_status?: ThesisGroupStatus; // สถานะกลุ่ม: pending, approved, rejected, incomplete

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  start_academic_year?: number; // ปีการศึกษาที่เริ่ม

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  start_term?: number; // ภาคเรียนที่เริ่ม

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  graduation_year?: number; // ปีที่จบ

  @IsOptional()
  @IsEnum(ThesisStatus)
  thesis_status?: ThesisStatus; // สถานะวิทยานิพนธ์: IN_PROGRESS, PASSED, FAILED

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1; // หน้าปัจจุบัน (Default 1)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10; // จำนวนต่อหน้า (Default 10)
}