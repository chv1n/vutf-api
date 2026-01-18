// src/modules/instructor/instructor.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserAccount } from '../users/entities/user-account.entity';
import { Instructor } from '../users/entities/instructor.entity';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';
import { GetInstructorsQueryDto } from './dto/get-instructors-query.dto';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';

import { QueryHelper, PaginatedResponse } from '../../common/helpers';
import { InstructorResponse } from './interfaces';

// ==================== Constants ====================
const INSTRUCTOR_SORT_FIELDS = ['instructor_code', 'first_name', 'last_name', 'create_at', 'email'];
const INSTRUCTOR_SEARCH_FIELDS = [
  'instructor.instructor_code',
  'instructor.first_name',
  'instructor.last_name',
  'user.email',
];
const INSTRUCTOR_FIELD_MAPPING = { email: 'user.email' };

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,

    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,

    private dataSource: DataSource,
  ) { }

  async createInstructorByAdmin(dto: CreateInstructorByAdminDto) {
    // เช็คว่ารหัสอาจารย์ซ้ำไหม
    const existingInstructor = await this.instructorRepository.findOne({
      where: { instructor_code: dto.instructorCode }
    });
    if (existingInstructor) {
      throw new ConflictException('รหัสอาจารย์นี้มีอยู่ในระบบแล้ว');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let emailToUse = dto.email;
      let passwordHashToUse: string | null = null;

      // ถ้าไม่ระบุอีเมล ให้สร้างอีเมลชั่วคราว
      if (!emailToUse) {
        emailToUse = `pending_${dto.instructorCode}_${Date.now()}@example.rmutt`;
      } else {
        const existingUser = await this.usersRepository.findOne({ where: { email: emailToUse } });
        if (existingUser) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
      }

      if (dto.password) {
        passwordHashToUse = await bcrypt.hash(dto.password, 10);
      }

      // 1. สร้าง User Account
      const user = queryRunner.manager.create(UserAccount, {
        email: emailToUse,
        passwordHash: passwordHashToUse,
        role: 'instructor',
        isActive: true,
      });

      const savedUser = await queryRunner.manager.save(user);

      // 2. สร้าง Instructor Profile
      const instructor = queryRunner.manager.create(Instructor, {
        instructor_code: dto.instructorCode,
        first_name: dto.firstName,
        last_name: dto.lastName,
        user_uuid: savedUser.user_uuid,
      });

      await queryRunner.manager.save(instructor);
      await queryRunner.commitTransaction();

      return {
        message: 'สร้างข้อมูลอาจารย์สำเร็จ',
        instructor,
        tempEmail: !dto.email ? emailToUse : undefined
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: GetInstructorsQueryDto): Promise<PaginatedResponse<InstructorResponse>> {
    const { page = 1, limit = 10, sortBy = 'create_at', sortOrder = 'DESC' } = query;

    const queryBuilder = this.createBaseQuery();

    this.applySearch(queryBuilder, query.search);
    this.applyFilters(queryBuilder, query);
    QueryHelper.applySorting(queryBuilder, 'instructor', {
      sortBy,
      sortOrder: sortOrder.toUpperCase() as 'ASC' | 'DESC',
      validFields: INSTRUCTOR_SORT_FIELDS,
      defaultField: 'create_at',
      fieldMapping: INSTRUCTOR_FIELD_MAPPING,
    });
    QueryHelper.applyPagination(queryBuilder, { page, limit });

    const [instructors, total] = await queryBuilder.getManyAndCount();
    return QueryHelper.createPaginatedResponse(
      instructors.map(this.mapToResponse),
      total,
      page,
      limit,
    );
  }


  private createBaseQuery() {
    return this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.user', 'user');
  }

  private applySearch(queryBuilder: ReturnType<typeof this.createBaseQuery>, search?: string) {
    QueryHelper.applySearch(queryBuilder, search, INSTRUCTOR_SEARCH_FIELDS);
  }

  private applyFilters(queryBuilder: ReturnType<typeof this.createBaseQuery>, query: GetInstructorsQueryDto) {
    const { instructorCode, isActive } = query;

    if (instructorCode) {
      queryBuilder.andWhere('instructor.instructor_code = :instructorCode', { instructorCode });
    }
    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }
  }

  private mapToResponse = (instructor: Instructor): InstructorResponse => ({
    instructor_uuid: instructor.instructor_uuid,
    instructor_code: instructor.instructor_code,
    first_name: instructor.first_name,
    last_name: instructor.last_name,
    full_name: `${instructor.first_name} ${instructor.last_name}`,
    email: instructor.user?.email || null,
    is_active: instructor.user?.isActive || false,
    create_at: instructor.create_at,
  });

  // ----------------------------------------------------------------
  // 📍 Instructor Self-Service Features
  // ----------------------------------------------------------------

  /**
   * ดึงข้อมูล Profile ของอาจารย์ที่ Login อยู่
   * @param userId user_uuid จาก JWT Payload
   */
  async getProfile(userId: string): Promise<InstructorResponse> {
    const instructor = await this.instructorRepository.findOne({
      where: { user_uuid: userId },
      relations: ['user'],
    });

    if (!instructor) {
      throw new NotFoundException('ไม่พบข้อมูลอาจารย์ในระบบ');
    }

    return this.mapToResponse(instructor);
  }

  /**
   * แก้ไขข้อมูลส่วนตัวของอาจารย์
   * @param userId user_uuid จาก JWT Payload
   * @param dto ข้อมูลที่ต้องการแก้ไข
   */
  async updateProfile(userId: string, dto: UpdateInstructorProfileDto): Promise<InstructorResponse> {
    const instructor = await this.instructorRepository.findOne({
      where: { user_uuid: userId },
      relations: ['user'],
    });

    if (!instructor) {
      throw new NotFoundException('ไม่พบข้อมูลอาจารย์');
    }

    if (dto.firstName) instructor.first_name = dto.firstName;
    if (dto.lastName) instructor.last_name = dto.lastName;

    const updatedInstructor = await this.instructorRepository.save(instructor);

    return this.mapToResponse(updatedInstructor);
  }
}