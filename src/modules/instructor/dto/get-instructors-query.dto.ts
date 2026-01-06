// src/modules/instructor/dto/get-instructors-query.dto.ts
import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseQueryDto } from '../../../common/dto';

/**
 * DTO สำหรับ query instructors
 * Extends BaseQueryDto เพื่อได้ pagination, sorting, search มาอัตโนมัติ
 */
export class GetInstructorsQueryDto extends BaseQueryDto {
    @IsOptional()
    @IsString()
    @IsIn(['instructor_code', 'first_name', 'last_name', 'create_at', 'email'])
    sortBy?: string = 'create_at';

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    instructorCode?: string;
}
