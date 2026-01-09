// src/modules/thesis/thesis.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';
import { Thesis } from './entities/thesis.entity';

@Injectable()
export class ThesisService {
  constructor(
    @InjectRepository(Thesis)
    private readonly thesisRepo: Repository<Thesis>,
  ) { }

  async createThesis(
    manager: EntityManager,
    dto: CreateThesisDto,
  ): Promise<Thesis> {
    const thesis = manager.create(Thesis, { ...dto });
    return await manager.save(thesis);
  }

  async updateThesis(thesisId: string, dto: UpdateThesisDto): Promise<Thesis> {
    const thesis = await this.thesisRepo.findOneBy({ thesis_id: thesisId });

    if (!thesis) {
      throw new NotFoundException('Thesis not found');
    }

    Object.assign(thesis, dto);
    return await this.thesisRepo.save(thesis);
  }

  async removeThesis(thesisId: string): Promise<{ message: string }> {
    const thesis = await this.thesisRepo.findOneBy({ thesis_id: thesisId });

    if (!thesis) {
      throw new NotFoundException('ไม่พบข้อมูลวิทยานิพนธ์ที่ต้องการลบ');
    }

    // ใช้ softDelete เพื่อให้ข้อมูลยังอยู่ใน DB แต่มีค่าใน delete_at
    await this.thesisRepo.softDelete(thesisId);

    return { message: 'ลบข้อมูลวิทยานิพนธ์เรียบร้อยแล้ว (Soft Delete)' };
  }
}

