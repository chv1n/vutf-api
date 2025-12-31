import { IsString, IsEnum, IsOptional } from 'class-validator';
import { GroupMemberRole } from '../enum/group-member-role.enum';
import { InvitationStatus } from '../enum/invitation-status.enum';

export class CreateGroupMemberDto {
  @IsString()
  student_uuid: string;

  @IsEnum(GroupMemberRole)
  role: string;


}
