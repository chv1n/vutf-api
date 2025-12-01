import { IsNotEmpty, IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum InspectionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

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

  @IsOptional()
  @IsEnum(InspectionStatus) 
  status?: InspectionStatus;
}