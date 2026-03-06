import { IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่านใหม่' })
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(50, { message: 'รหัสผ่านต้องมีความยาวไม่เกิน 50 ตัวอักษร' })
  @Matches(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { 
      message: 'รหัสผ่านต้องประกอบด้วย ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่ และตัวเลข' 
    }
  )
  newPassword: string;
}