// src/modules/class-sections/class-sections.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { ClassSection } from './entities/class-section.entity';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';
import { GetClassSectionsFilterDto } from './dto/get-class-sections-filter.dto';

@Injectable()
export class ClassSectionsService {
  constructor(
    @InjectRepository(ClassSection)
    private readonly repo: Repository<ClassSection>,
  ) { }

  // ---------------------------------------------------------------------------
  // 1. Create
  // ---------------------------------------------------------------------------
  async create(dto: CreateClassSectionDto) {
    // ตรวจสอบข้อมูลซ้ำก่อนสร้าง
    await this.checkDuplicate(dto.academic_year, dto.term, dto.section_name);
    const section = this.repo.create(dto);
    return await this.repo.save(section);
  }

  // ---------------------------------------------------------------------------
  // 2. Find All with Filter & Pagination
  // ---------------------------------------------------------------------------
  async findAllWithFilter(filterDto: GetClassSectionsFilterDto) {
    const { search, academic_year, term, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    // สร้างเงื่อนไข Where
    const where: any = {};

    if (academic_year) where.academic_year = academic_year;
    if (term) where.term = term;
    if (search) where.section_name = Like(`%${search}%`); // ค้นหาชื่อ Section

    // Query และนับจำนวน
    const [data, totalItems] = await this.repo.findAndCount({
      where,
      order: { academic_year: 'DESC', term: 'DESC', section_name: 'ASC' },
      skip,
      take: limit,
    });

    // คำนวณ Meta Data
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Update
  // ---------------------------------------------------------------------------
  async update(id: number, dto: UpdateClassSectionDto) {
    const section = await this.repo.findOneBy({ section_id: id });

    if (!section) {
      throw new NotFoundException(`Class section with ID ${id} not found`);
    }

    // เตรียมค่าที่จะถูกบันทึกจริง (ถ้า dto ไม่ส่งมา ให้ใช้ค่าเดิม)
    const yearToCheck = dto.academic_year ?? section.academic_year;
    const termToCheck = dto.term ?? section.term;
    const nameToCheck = dto.section_name ?? section.section_name;

    // ตรวจสอบข้อมูลซ้ำ (ส่ง id ไปด้วยเพื่อบอกว่า "ยกเว้นตัวเอง")
    await this.checkDuplicate(yearToCheck, termToCheck, nameToCheck, id);

    this.repo.merge(section, dto);
    return await this.repo.save(section);
  }

  // ---------------------------------------------------------------------------
  // 4. Soft Delete
  // ---------------------------------------------------------------------------
  async remove(id: number) {
    const section = await this.repo.findOneBy({ section_id: id });

    if (!section) {
      throw new NotFoundException(`Class section with ID ${id} not found`);
    }

    await this.repo.softRemove(section);
    return section;
  }

  // ---------------------------------------------------------------------------
  // 🛠 Helper: คำนวณเทอมปัจจุบัน (Logic มทร.ธัญบุรี + แปลงเป็น พ.ศ.)
  // ---------------------------------------------------------------------------
  getCurrentSemester(): { academic_year: number; term: string } {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    const year = now.getFullYear() + 543;

    let academic_year = year;
    let term = '1';

    if (month >= 6 && month <= 10) {
      // มิ.ย. - ต.ค. -> เทอม 1
      term = '1';
      academic_year = year;
    } else if (month >= 11 || month <= 3) {
      // พ.ย. - มี.ค. -> เทอม 2
      term = '2';
      // ถ้าเป็นเดือน ม.ค.-มี.ค. ปีการศึกษาจะเป็นของปีก่อนหน้า
      if (month <= 3) academic_year = year - 1;
      else academic_year = year;
    } else {
      // เม.ย. - พ.ค. -> Summer
      term = '3';
      academic_year = year - 1;
    }

    return { academic_year, term };
  }

  // ---------------------------------------------------------------------------
  // 🛠 Helper: ตรวจสอบว่ามีกลุ่มเรียนนี้อยู่แล้วหรือไม่
  // ---------------------------------------------------------------------------
  private async checkDuplicate(
    year: number,
    term: string,
    name: string,
    excludeId?: number
  ) {
    const whereCondition: any = {
      academic_year: year,
      term: term,
      section_name: name,
    };

    // กรณี Update: ต้องไม่นับตัวเอง (ถ้าแก้ชื่อ แต่ไม่ได้ไปซ้ำคนอื่น ก็ต้องผ่าน)
    if (excludeId) {
      whereCondition.section_id = Not(excludeId);
    }

    const existingSection = await this.repo.findOne({
      where: whereCondition,
    });

    if (existingSection) {
      throw new ConflictException(
        `กลุ่มเรียน ${name} (เทอม ${term}/${year}) มีอยู่ในระบบแล้ว`
      );
    }
  }
  
}