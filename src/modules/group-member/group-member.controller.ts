// src/modules/group-member/group-member.controller.ts
import { Controller, UseGuards, Req, Put, Param, Patch, Body, Get, Post, Delete } from '@nestjs/common';
import { GroupMemberService } from './group-member.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { AddMemberDto } from './dto/add-member.dto';

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

  @UseGuards(AuthGuard('jwt'))
  @Get('/my-invitations')
  async getMyInvitations(@Req() req) {
    return this.groupMemberService.getMyInvitations(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/my-group')
  async getMyGroup(@Req() req) {
    return this.groupMemberService.getMyGroup(req.user.userId);
  }


  @UseGuards(AuthGuard('jwt'))
  @Post('/:groupId/invite')
  async inviteMember(
    @Req() req,
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupMemberService.addMember(req.user.userId, groupId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/:groupId/member/:memberId')
  async removeMember(
    @Req() req,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupMemberService.removeMember(req.user.userId, groupId, memberId);
  }
}
