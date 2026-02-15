// src/modules/audit-log/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) { }

  async createLog(userId: string, action: string, description: string, target?: any, ip?: string) {
    if (!userId) {
      console.error('AuditLog Error: userId is missing');
      return;
    }

    const log = this.auditLogRepo.create({
      user: { user_uuid: userId } as any,
      action,
      description,
      targetType: target?.type,
      targetId: target?.id,
      ipAddress: ip,
    });

    return await this.auditLogRepo.save(log);
  }

  // ฟังก์ชันดึงประวัติล่าสุด (สำหรับโชว์ใน Recent Activity Drawer)
  async findRecent() {
    return await this.auditLogRepo.find({
      relations: ['user'], 
      order: { timeStamp: 'DESC' }, 
      take: 20,
    });
  }
}