// src/modules/thesis-group/dto/admin-approve-group.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ThesisGroupStatus } from '../entities/thesis-group.entity';

export class AdminApproveGroupDto {
  @IsEnum(ThesisGroupStatus)
  status: ThesisGroupStatus;

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}