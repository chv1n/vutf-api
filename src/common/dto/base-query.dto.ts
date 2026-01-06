// src/common/dto/base-query.dto.ts
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base DTO สำหรับ pagination
 * ใช้สำหรับ extend ใน DTO อื่นๆ ที่ต้องการ pagination
 */
export class PaginationQueryDto {
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

/**
 * Base DTO สำหรับ sorting
 * ใช้สำหรับ extend ใน DTO อื่นๆ ที่ต้องการ sorting
 */
export class SortingQueryDto {
    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}

/**
 * Base DTO รวม pagination + sorting + search
 * ใช้สำหรับ extend ใน DTO ที่ต้องการ query features ครบ
 */
export class BaseQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}
