// src/modules/audit-log/audit-log.controller.ts
import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { GetAuditLogsFilterDto } from './dto/get-audit-logs-filter.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }

  @Get('recent')
  @Roles('admin')
  async getRecent() {
    // ดึงประวัติ 20 รายการล่าสุดมาโชว์ใน Drawer
    return await this.auditLogService.findRecent();
  }

  @Get()
  @Roles('admin')
  async getAllLogs(@Query() filterDto: GetAuditLogsFilterDto) {
    return await this.auditLogService.findAllLogs(filterDto);
  }

  @Get('stats')
  @Roles('admin')
  async getLogStats(@Query() filterDto: GetAuditLogsFilterDto) {
    return await this.auditLogService.getLogStats(filterDto);
  }

}
