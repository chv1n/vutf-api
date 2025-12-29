import { Controller } from '@nestjs/common';
import { GroupMemberService } from './group-member.service';

@Controller('group-member')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}
}
