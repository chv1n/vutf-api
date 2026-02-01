import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { InstructorReviewStatus } from '../enum/report-status.enum';

export class UpdateReportFileDto {
    @IsNotEmpty() // บังคับว่าต้องมีสถานะส่งมาเสมอ (เช่น กดผ่าน/ไม่ผ่าน)
    @IsEnum(InstructorReviewStatus)
    reviewStatus: InstructorReviewStatus;

    @IsOptional() // คอมเมนต์อาจจะไม่ใส่ก็ได้
    @IsString()
    comment?: string;
}