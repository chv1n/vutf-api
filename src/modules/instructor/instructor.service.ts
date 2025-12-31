import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserAccount } from '../users/entities/user-account.entity';
import { Instructor } from '../users/entities/instructor.entity';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,

    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,

    private dataSource: DataSource,
  ) {}

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

}