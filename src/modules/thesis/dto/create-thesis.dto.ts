import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { CourseType } from '../enums/course-type.enum';
export class CreateThesisDto {
  @IsString()
  @IsNotEmpty()
  thesis_code: string;

  @IsString()
  @IsNotEmpty()
  thesis_name_th: string;

  @IsString()
  @IsNotEmpty()
  thesis_name_en: string;

  @IsNumber()
  @IsOptional()
  graduation_year?: number;

  @IsEnum(CourseType)
  @IsNotEmpty()
  course_type: CourseType;

  @IsNumber()
  @IsNotEmpty()
  start_academic_year: number;

  @IsNumber()
  @IsNotEmpty()
  start_term: number;
}
