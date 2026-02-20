// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notiRepo: Repository<Notification>,
    private notiGateway: NotificationsGateway,
  ) { }

  // ฟังก์ชันหลักที่ Module อื่นจะเรียกใช้
  async createAndSend(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ) {
    // 1. บันทึกลง Database
    const newNoti = this.notiRepo.create({
      user_id: userId,
      type,
      title,
      message,
      data,
      is_read: false
    });

    const savedNoti = await this.notiRepo.save(newNoti);

    // 2. ส่ง Real-time ผ่าน Socket ไปหา User คนนั้นทันที
    this.notiGateway.sendToUser(userId, savedNoti);

    return savedNoti;
  }

  // ดึงประวัติการแจ้งเตือนของ User
  async findAllByUser(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.notiRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ดึงสำหรับดรอปดาวน์ (เอาแค่ 10 อันล่าสุด)
  async findRecent(userId: string) {
    return this.notiRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 20,
    });
  }

  // ทำเครื่องหมายว่าอ่านแล้ว
  async markAsRead(id: string) {
    return this.notiRepo.update(id, { is_read: true });
  }

  // อ่านทั้งหมด
  async markAllAsRead(userId: string) {
    return this.notiRepo.update({ user_id: userId, is_read: false }, { is_read: true });
  }
}