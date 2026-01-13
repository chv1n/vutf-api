import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ClassSection } from './entities/class-section.entity';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';
import { GetClassSectionsFilterDto } from './dto/get-class-sections-filter.dto';

@Injectable()
export class ClassSectionsService {
  constructor(
    @InjectRepository(ClassSection)
    private readonly repo: Repository<ClassSection>,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Create
  // ---------------------------------------------------------------------------
  async create(dto: CreateClassSectionDto) {
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
  // 🛠 Helper: คำนวณเทอมปัจจุบัน (Logic มทร.ธัญบุรี โดยประมาณ)
  // ---------------------------------------------------------------------------
  getCurrentSemester(): { academic_year: number; term: string } {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

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
}