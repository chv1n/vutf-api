// src/modules/users/dto/create-student-by-admin.dto.ts
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateStudentByAdminDto {
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @Matches(/@mail\.rmutt\.ac\.th$/, { message: 'ต้องใช้อีเมล @mail.rmutt.ac.th เท่านั้น' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุคำนำหน้าชื่อ (เช่น นาย, นางสาว)' }) 
  prefixName: string; 

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อจริง' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุนามสกุล' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสนักศึกษา' })
  studentCode: string;

  @IsString()
  phone: string = ''; 
}