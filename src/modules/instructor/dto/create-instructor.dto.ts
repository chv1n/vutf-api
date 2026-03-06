// src/modules/users/dto/create-instructor-by-admin.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class CreateInstructorByAdminDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  instructorCode: string;
  
  // ตรวจสอบ Email ถ้ามีการส่งค่ามา (ไม่เป็น null/undefined/empty string)
  @ValidateIf((o) => o.email && o.email !== '') 
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  // @Matches(/@mail\.rmutt\.ac\.th$/, { message: 'ต้องใช้อีเมล @mail.rmutt.ac.th เท่านั้น' })
  email?: string;

  // ตรวจสอบ Password ถ้ามีการส่ง Email มา (แปลว่าจะสร้าง User ต้องมี Password ด้วย)
  @ValidateIf((o) => o.email && o.email !== '')
  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password?: string;
}