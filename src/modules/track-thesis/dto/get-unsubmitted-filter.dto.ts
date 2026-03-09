// src/modules/track-thesis/dto/get-unsubmitted-filter.dto.ts
import { IsOptional, IsInt, IsString, IsEnum, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CourseType, ThesisStatus } from '../../thesis/enums/course-type.enum';
import { SubmissionStatus } from '../../submissions/enum/submission-status.enum';

export class GetUnsubmittedFilterDto {
    @IsOptional()
    @IsString()
    academicYear?: string; // เช่น "2567"

    @IsOptional()
    @IsString()
    term?: string; // เช่น "1", "2"

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    roundNumber?: number; // เช่น 1, 2, 3

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    inspectionId?: number;


    // --- ตัวกรองข้อมูล (Data Filters) ---
    @IsOptional()
    @IsString()
    search?: string; // ค้นหาชื่อ นศ. / รหัส / ชื่อ Thesis

    @IsOptional()
    @IsString()
    advisorName?: string;

    @IsOptional()
    @IsEnum(CourseType)
    courseType?: CourseType; // กรอง Pre-Project หรือ Project

    @IsOptional()
    @IsEnum(SubmissionStatus)
    status?: SubmissionStatus;

    @IsOptional()
    @IsString()
    submissionStatus?: string;

    @IsOptional()
    @IsString()
    verificationStatus?: string;

    // --- Pagination & Export ---
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

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    isExport?: boolean;

    @IsOptional()
    @IsString()
    sortOrder?: string;

}