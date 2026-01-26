// src/modules/thesis-topic/dto/admin-approve-group.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ThesisGroupStatus } from '../../thesis-group/entities/thesis-group.entity'; // ปรับ Import path ให้ถูกต้อง

export class AdminApproveGroupDto {
  @IsEnum(ThesisGroupStatus)
  status: ThesisGroupStatus;

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}