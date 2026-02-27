// src/modules/audit-log/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { GetAuditLogsFilterDto } from './dto/get-audit-logs-filter.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

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

  async findRecent() {
    return await this.auditLogRepo.find({
      relations: ['user', 'user.student', 'user.instructor'],
      order: { timeStamp: 'DESC' },
      take: 20,
    });
  }

  /**
   * Private Method กลางสำหรับสร้าง Base Query และจัดการ Filtering
   * ช่วยลดความซ้ำซ้อนของโค้ด (DRY Principle)
   */
  private getBaseQuery(filterDto: GetAuditLogsFilterDto): SelectQueryBuilder<AuditLog> {
    const { search, action, startDate, endDate } = filterDto;
    
    const query = this.auditLogRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('user.student', 'student')
      .leftJoinAndSelect('user.instructor', 'instructor');

    // 1. กรองตามประเภท Action (Multi-select)
    if (action) {
      const actionList = action.split(',');
      query.andWhere('log.action IN (:...actionList)', { actionList });
    }

    // 2. กรองตามช่วงวันที่
    if (startDate) {
      query.andWhere('log.timeStamp >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('log.timeStamp <= :endDate', { endDate: end });
    }

    // 3. กรองตามคำค้นหา
    if (search) {
      query.andWhere(new Brackets(qb => {
        qb.where('log.description LIKE :search', { search: `%${search}%` })
          .orWhere('log.action LIKE :search', { search: `%${search}%` })
          .orWhere('user.email LIKE :search', { search: `%${search}%` })
          .orWhere('student.first_name LIKE :search', { search: `%${search}%` })
          .orWhere('student.last_name LIKE :search', { search: `%${search}%` })
          .orWhere('instructor.first_name LIKE :search', { search: `%${search}%` })
          .orWhere('instructor.last_name LIKE :search', { search: `%${search}%` })
          .orWhere('log.ipAddress LIKE :search', { search: `%${search}%` });
      }));
    }

    return query;
  }

  async findAllLogs(filterDto: GetAuditLogsFilterDto) {
    const { page = 1, limit = 20 } = filterDto;
    
    // เรียกใช้ Base Query
    const query = this.getBaseQuery(filterDto);

    // เรียงลำดับและแบ่งหน้า
    query.orderBy('log.timeStamp', 'DESC')
         .skip((page - 1) * limit)
         .take(limit);

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: {
        totalItems: total,
        itemCount: logs.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      }
    };
  }

  async getLogStats(filterDto: GetAuditLogsFilterDto) {
    // เรียกใช้ Base Query
    const query = this.getBaseQuery(filterDto);

    // 1. จำนวน Log ทั้งหมด และ จำนวนที่ล้มเหลว
    const [totalLogs, failedLogs] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('log.action LIKE :fail', { fail: '%FAILED%' }).getCount()
    ]);

    // 2. แยกประเภท Action (สำหรับ Pie Chart)
    const actionStats = await query.clone()
      .select('log.action', 'action')
      .addSelect('COUNT(log.logId)', 'count')
      .groupBy('log.action')
      .getRawMany();

    // 3. Top 5 ผู้ใช้งาน (สำหรับ Bar Chart)
    const topUsers = await query.clone()
      .select('COALESCE(user.email, log.ipAddress)', 'identifier')
      .addSelect('COUNT(log.logId)', 'count')
      .groupBy('identifier')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return { totalLogs, failedLogs, actionStats, topUsers };
  }
}