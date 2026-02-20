// src/modules/announcements/announcements.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    const announcement = this.announcementRepository.create(createAnnouncementDto);
    return await this.announcementRepository.save(announcement);
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.announcementRepository.createQueryBuilder('announcement');

    if (search) {
      query.where('announcement.title ILIKE :search OR announcement.description ILIKE :search', { 
        search: `%${search}%` 
      });
    }

    const totalItems = await query.getCount();
    
    const data = await query
      .orderBy('announcement.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findOne(id: string) {
    const announcement = await this.announcementRepository.findOneBy({ announceId: id });
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    return announcement;
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto) {
    const announcement = await this.findOne(id);
    Object.assign(announcement, updateAnnouncementDto);
    return await this.announcementRepository.save(announcement);
  }

  async remove(id: string) {
    const result = await this.announcementRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    return { message: 'Deleted successfully' };
  }
}