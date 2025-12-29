import { IsString, IsEnum } from 'class-validator';
import { GroupMemberRole } from '../enum/group-member-role.enum';

export class CreateGroupMemberDto {
  @IsString()
  student_id: string;

  @IsEnum(GroupMemberRole)
  role: string;
}
