// src/modules/audit-log/audit-log.controller.ts
import { Controller, UseGuards, Get} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('recent')
  @Roles('admin')
  async getRecent() {
    // ดึงประวัติ 20 รายการล่าสุดมาโชว์ใน Drawer
    return await this.auditLogService.findRecent();
  }

}
