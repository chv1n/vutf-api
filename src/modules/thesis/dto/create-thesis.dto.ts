import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
