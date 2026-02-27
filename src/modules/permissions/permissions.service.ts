// src/modules/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  // ดึงรายการสิทธิ์ทั้งหมดในระบบ
  async findAll() {
    return this.permissionRepo.find({
      order: { resource: 'ASC', action: 'ASC' }
    });
  }
}