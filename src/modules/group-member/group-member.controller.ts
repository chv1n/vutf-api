import { Controller, UseGuards, Req, Put, Param, Patch, Body } from '@nestjs/common';
import { GroupMemberService } from './group-member.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';

@Controller('group-member')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) { }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/:memberId/invitation-status')
  async updateInvitationStatus(@Req() req,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateInvitationStatusDto
  ) {
    return this.groupMemberService.updateInvitationStatus(req.user.userId, memberId, dto);
  }
}
