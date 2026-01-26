// src/modules/class-sections/dto/get-class-sections-filter.dto.ts
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetClassSectionsFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // ค้นหาจาก section_name

  @IsOptional()
  @Type(() => Number) // แปลง Query String เป็น Number
  @IsNumber()
  academic_year?: number;

  @IsOptional()
  @IsString()
  term?: string;

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
}