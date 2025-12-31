// src/modules/users/dto/invite-students.dto.ts
import { ArrayNotEmpty, IsArray, IsEmail, Matches } from 'class-validator';

export class InviteStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true, message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @Matches(/@mail\.rmutt\.ac\.th$/, { 
    each: true, 
    message: 'ต้องใช้อีเมล @mail.rmutt.ac.th เท่านั้น' 
  })
  emails: string[];
}