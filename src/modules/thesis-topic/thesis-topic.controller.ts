// src/modules/thesis-topic/thesis-topic.controller.ts
import { Controller, Get, Delete, Param, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { ThesisTopicService } from './thesis-topic.service';
import { AdminApproveGroupDto } from './dto/admin-approve-group.dto';
import { GetGroupsFilterDto } from './dto/get-groups-filter.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('thesis-topics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ThesisTopicController {
  constructor(private readonly thesisTopicService: ThesisTopicService) { }

  @Get('groups')
  getGroupsForAdmin(@Query() filterDto: GetGroupsFilterDto) {
    return this.thesisTopicService.getGroupsForAdmin(filterDto);
  }

  @Patch('groups/:id/status')
  adminUpdateStatus(
    @Param('id') groupId: string,
    @Body() dto: AdminApproveGroupDto,
  ) {
    return this.thesisTopicService.adminUpdateStatus(groupId, dto);
  }

  @Delete(':id')
  removeThesis(@Param('id') id: string) {
    return this.thesisTopicService.removeThesis(id);
  }
}