import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateClassSectionDto {
  @IsString()
  @IsNotEmpty()
  section_name: string;

  @IsNumber()
  @IsNotEmpty()
  academic_year: number;

  @IsString()
  @IsNotEmpty()
  term: string;
}