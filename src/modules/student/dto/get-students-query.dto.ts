// src/modules/student/dto/get-students-query.dto.ts
import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseQueryDto } from '../../../common/dto';

/**
 * DTO สำหรับ query students
 * Extends BaseQueryDto เพื่อได้ pagination, sorting, search มาอัตโนมัติ
 */
export class GetStudentsQueryDto extends BaseQueryDto {
    // ==================== Override sortBy ====================
    @IsOptional()
    @IsString()
    @IsIn(['student_code', 'first_name', 'last_name', 'create_at', 'email'])
    sortBy?: string = 'create_at';

    // ==================== Student-specific Filters ====================
    @IsOptional()
    @IsString()
    prefixName?: string;

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
    studentCode?: string;
}
