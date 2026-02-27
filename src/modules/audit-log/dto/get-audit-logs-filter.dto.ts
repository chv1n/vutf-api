// src/modules/audit-log/dto/get-audit-logs-filter.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class GetAuditLogsFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // คำค้นหา (เช่น อีเมล, ชื่อ, คำอธิบาย)

  @IsOptional()
  @IsString()
  action?: string; // ประเภท Action (เช่น LOGIN, UPLOAD, LOGIN_FAILED)

  @IsOptional()
  @IsString()
  startDate?: string; // วันที่เริ่มต้น

  @IsOptional()
  @IsString()
  endDate?: string; // วันที่สิ้นสุด

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}