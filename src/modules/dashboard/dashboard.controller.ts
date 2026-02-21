// src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, Query, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('stats')
  @Roles('admin')
  async getStats() {
    const data = await this.dashboardService.getDashboardStats();
    return data;
  }

  @Get('verification-stats')
  @Roles('admin')
  async getVerificationStats(
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    // แปลง String เป็น Number ถ้ามีการส่งค่ามา
    const filter = {
      academicYear: academicYear ? Number(academicYear) : undefined,
      term: term ? Number(term) : undefined,
    };

    const data = await this.dashboardService.getVerificationStats(filter);

    return data;
  }

  @Get('recent-uploads')
  @Roles('admin')
  async getRecentUploads() {
    const data = await this.dashboardService.getRecentUploads();
    return data;
  }

  @Get('group-requests')
  @Roles('admin')
  async getGroupRequests() {
    const data = await this.dashboardService.getPendingGroupRequests();
    return data;
  }

  @Patch('group-requests/:id/approve')
  @Roles('admin')
  async approveGroupRequest(@Param('id') id: string) {
    const data = await this.dashboardService.approveGroupRequest(id);
    return data;
  }

  @Patch('group-requests/:id/reject')
  @Roles('admin')
  async rejectGroupRequest(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.dashboardService.rejectGroupRequest(id, reason);
    return data;
  }

  @Get('system-status')
  async getSystemStatus() {
    const pythonStatus = await this.dashboardService.getPythonEngineStatus();
    return {
      pythonEngine: pythonStatus
    };
  }
}