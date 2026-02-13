// src/modules/track-thesis/track-thesis.controller.ts
import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { TrackThesisService } from './track-thesis.service';
import { GetUnsubmittedFilterDto } from './dto/get-unsubmitted-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('track-thesis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrackThesisController {
  constructor(private readonly trackThesisService: TrackThesisService) { }

  /**
   * ดูรายชื่อกลุ่มที่ "ยังไม่ส่ง"
   * GET /track-thesis/unsubmitted
   */
  @Get('unsubmitted')
  @Roles('admin', 'instructor')
  async getUnsubmittedGroups(@Query() filterDto: GetUnsubmittedFilterDto) {
    return this.trackThesisService.getUnsubmittedGroups(filterDto);
  }

  /**
   * ดูรายชื่อกลุ่มที่ "ส่งงานแล้ว"
   * GET /track-thesis/submitted
   */
  @Get('submitted')
  @Roles('admin', 'instructor')
  async getSubmittedGroups(@Query() filterDto: GetUnsubmittedFilterDto) {
    return this.trackThesisService.getSubmittedGroups(filterDto);
  }

  /**
   * ส่ง email แจ้งเตือนให้นักศึกษากลุ่มนั้นๆ
   * POST /track-thesis/remind/:groupId
   */
  @Post('remind/:groupId')
  @Roles('admin', 'instructor')
  async remind(@Param('groupId') groupId: string, @Body('inspectionId') inspectionId: number) {
    return this.trackThesisService.remindGroup(groupId, inspectionId);
  }

}