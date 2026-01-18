// src/modules/users/dto/get-users-filter.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserRoleFilter {
  ALL = 'all',
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
}

export class GetUsersFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // คำค้นหา (ชื่อ, อีเมล, รหัสนักศึกษา)

  @IsOptional()
  @IsEnum(UserRoleFilter)
  role?: UserRoleFilter; // กรองตาม Tab (Student, Instructor)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // หน้าปัจจุบัน (Default 1)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10; // จำนวนต่อหน้า (Default 10)

  @IsOptional()
  academicYear?: string;

  @IsOptional()
  term?: string; 

  @IsOptional()
  sectionId?: number;
}