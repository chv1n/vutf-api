import { IsString, IsOptional, Length, IsPhoneNumber } from 'class-validator';

export class UpdateStudentProfileDto {
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
  // @IsPhoneNumber('TH') // เปิดใช้ถ้าต้องการ validate เบอร์ไทยเข้มข้น
  phone?: string;
  
  // หมายเหตุ: ปกติเราจะไม่ให้ Student แก้ sectionId หรือ studentCode เอง 
  // ต้องแจ้งเจ้าหน้าที่ หรือทำระบบย้าย Section แยกต่างหาก
}