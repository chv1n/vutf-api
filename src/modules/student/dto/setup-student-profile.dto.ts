// src/modules/users/dto/setup-student-profile.dto.ts
import { IsNotEmpty, IsString, MinLength, IsNumber } from 'class-validator';

export class SetupStudentProfileDto {
  @IsString()
  @IsNotEmpty()
  token: string; 

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsString()
  @IsNotEmpty()
  prefixName: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  section_id: number;
}