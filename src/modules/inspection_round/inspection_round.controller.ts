// src/modules/inspection_round/inspection_round.controller.ts
import { Controller, Post, Body, UseGuards, Patch, Param, Delete, ParseIntPipe, Get, Query, Req } from '@nestjs/common';
import { InspectionRoundService } from './inspection_round.service';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';
import { GetInspectionRoundsQueryDto } from './dto/get-inspection-rounds-query.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InspectionRoundController {
  constructor(private readonly inspectionRoundService: InspectionRoundService) { }

  @Get()
  @Roles('admin', 'student', 'instructor')
  async findAll(@Query() query: GetInspectionRoundsQueryDto) {
    return await this.inspectionRoundService.findAll(query);
  }

  @Post()
  @RequirePermissions('manage:inspections')
  async create(@Body() createInspectionRoundDto: CreateInspectionRoundDto) {
    return await this.inspectionRoundService.create(createInspectionRoundDto);
  }

  /**
   * GET /inspections/active-options
   * ดึงตัวเลือกสำหรับ Dropdown (เฉพาะรอบที่เปิดอยู่)
   */
  @Get('active-options')
  @Roles('admin', 'student', 'instructor')
  async getActiveOptions() {
    return this.inspectionRoundService.getActiveRoundsForDropdown();
  }

  @Get('active')
  async findActive() {
    const rounds = await this.inspectionRoundService.findAllActive();
    return rounds[0] || null;
  }

  @Get('my-available')
  @Roles('student')
  async getMyAvailable(@Req() req: any) {
    const userId = req.user.userId; 
    return await this.inspectionRoundService.getAvailableRoundsForUser(userId);
  }

  @Get(':id')
  @Roles('admin', 'student', 'instructor')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.inspectionRoundService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('manage:inspections')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInspectionRoundDto: UpdateInspectionRoundDto,
  ) {
    return await this.inspectionRoundService.update(id, updateInspectionRoundDto);
  }

  @Delete(':id')
  @RequirePermissions('manage:inspections')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.inspectionRoundService.remove(id);
  }

  @Patch(':id/status')
  @RequirePermissions('manage:inspections')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return await this.inspectionRoundService.toggleStatus(id);
  }

  @Get('group/:groupId/available')
  @Roles('admin', 'student', 'instructor')
  async getAvailableForGroup(@Param('groupId') groupId: string) {
    return await this.inspectionRoundService.getAvailableRoundsForGroup(groupId);
  }

}