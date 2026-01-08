import * as bcrypt from 'bcrypt';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Student } from './entities/student.entity';
import { Instructor } from './entities/instructor.entity';
import { GetUsersFilterDto, UserRoleFilter } from './dto/get-users-filter.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,

    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
    private dataSource: DataSource,

  ) { }

  // ฟังก์ชันนี้ AuthModule จะเรียกใช้
  async findByEmail(email: string): Promise<UserAccount | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(userId: string): Promise<UserAccount | null> {
    return this.usersRepository.findOne({
      where: { user_uuid: userId },
      relations: ['student', 'instructor'],
    });
  }

  async updatePassword(email: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update({ email }, { passwordHash });
  }

  async findAllUsers(filterDto: GetUsersFilterDto) {
    const { search, role, page = 1, limit = 10 } = filterDto;

    const query = this.usersRepository.createQueryBuilder('user');

    query.leftJoinAndSelect('user.student', 'student');
    query.leftJoinAndSelect('user.instructor', 'instructor');

    if (role && role !== UserRoleFilter.ALL) {
      query.andWhere('user.role = :role', { role });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.email ILIKE :search', { search: `%${search}%` })
            .orWhere('student.first_name ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('student.last_name ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('student.student_code ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('instructor.first_name ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('instructor.last_name ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('instructor.instructor_code ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }

    query.orderBy('user.createdAt', 'DESC');

    query.skip((page - 1) * limit);
    query.take(limit);

    const [users, total] = await query.getManyAndCount();

    const sanitizedUsers = users.map((user) => {
      const { passwordHash, ...rest } = user;
      return rest;
    });

    return {
      data: sanitizedUsers,
      meta: {
        totalItems: total,
        itemCount: users.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async findOneUser(id: string) {
    const user = await this.usersRepository.findOne({
      where: { user_uuid: id },
      relations: ['student', 'instructor'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // ตัด Password ทิ้งก่อนส่งกลับ
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { user_uuid: id },
      relations: ['student', 'instructor']
    });

    if (!user) throw new NotFoundException('User not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. อัปเดตข้อมูล UserAccount (Email, Password, Active)
      if (dto.email) user.email = dto.email;
      if (dto.isActive !== undefined) user.isActive = dto.isActive;
      if (dto.password) {
        const salt = await bcrypt.genSalt();
        user.passwordHash = await bcrypt.hash(dto.password, salt);
      }

      await queryRunner.manager.save(user);

      // 2. อัปเดตข้อมูล Profile ตาม Role
      if (user.role === 'student' && user.student) {
        if (dto.prefixName) user.student.prefix_name = dto.prefixName;
        if (dto.firstName) user.student.first_name = dto.firstName;
        if (dto.lastName) user.student.last_name = dto.lastName;
        if (dto.phone) user.student.phone = dto.phone;
        if (dto.studentCode) user.student.student_code = dto.studentCode;

        await queryRunner.manager.save(user.student);
      }
      else if (user.role === 'instructor' && user.instructor) {
        if (dto.firstName) user.instructor.first_name = dto.firstName;
        if (dto.lastName) user.instructor.last_name = dto.lastName;

        // --- Logic เช็ค Instructor ID ซ้ำ ---
        if (dto.instructorCode) {
            // เช็คว่ารหัสที่ส่งมา ซ้ำกับคนอื่นในระบบไหม?
            const existingInstructor = await this.instructorRepository.findOne({
                where: { instructor_code: dto.instructorCode }
            });

            // ถ้าเจอคนใช้รหัสนี้ และคนนั้น "ไม่ใช่" คนที่เรากำลังแก้ไขอยู่
            if (existingInstructor && existingInstructor.instructor_uuid !== user.instructor.instructor_uuid) {
                throw new ConflictException(`รหัสอาจารย์ "${dto.instructorCode}" มีอยู่ในระบบแล้ว`);
            }

            user.instructor.instructor_code = dto.instructorCode;
        }
        await queryRunner.manager.save(user.instructor);
      }

      await queryRunner.commitTransaction();
      return this.findOneUser(id);

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeUser(id: string) {
    const user = await this.usersRepository.findOne({ where: { user_uuid: id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    user.isActive = false;
    await this.usersRepository.save(user);

    return { message: 'User deactivated successfully (Soft Delete)' };
  }

}
