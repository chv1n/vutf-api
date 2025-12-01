import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateInspectionRoundDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString()
  startDate: string; // รับเป็น String (ISO8601) แล้วแปลงเป็น Date ใน Service

  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString()
  endDate: string;
}