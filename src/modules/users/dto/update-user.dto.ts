// src/modules/users/dto/admin-update-user.dto.ts
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  prefixName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  studentCode?: string;

  @IsOptional()
  @IsString()
  instructorCode?: string;

  @IsOptional()
  @IsString()
  phone?: string; // มีผลเฉพาะ Student (Instructor ไม่มี field นี้ใน Entity )

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Admin สามารถสั่ง Ban/Unban ได้

  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  // @Matches(/@mail\.rmutt\.ac\.th$/, { message: 'ต้องใช้อีเมล @mail.rmutt.ac.th เท่านั้น' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password?: string;
}