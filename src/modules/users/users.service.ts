import * as bcrypt from 'bcrypt';
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Student } from './entities/student.entity';
import { Instructor } from './entities/instructor.entity';
import { GetUsersFilterDto, UserRoleFilter } from './dto/get-users-filter.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { CreateStudentByAdminDto } from './dto/create-student.dto';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';

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

  async studentRegister(
    email: string,
    passwordHash: string,
    studentData: {
      prefixName: string;
      firstName: string;
      lastName: string;
      phone: string;
    },
  ): Promise<UserAccount> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create UserAccount
      const user = queryRunner.manager.create(UserAccount, {
        email,
        passwordHash,
        role: 'student',
        isActive: true,
      });

      const savedUser = await queryRunner.manager.save(user);

      const studentCode = email.split('@')[0];
      const formattedStudentCode = `${studentCode.slice(0, -1)}-${studentCode.slice(-1)}`;

      const student = queryRunner.manager.create(Student, {
        user_uuid: savedUser.user_uuid,
        prefix_name: studentData.prefixName,
        first_name: studentData.firstName,
        last_name: studentData.lastName,
        phone: studentData.phone,
        student_code: formattedStudentCode,
      });

      await queryRunner.manager.save(student);

      await queryRunner.commitTransaction();

      return savedUser;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePassword(email: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(
      { email },
      { passwordHash }
    );
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
            .orWhere('student.first_name ILIKE :search', { search: `%${search}%` })
            .orWhere('student.last_name ILIKE :search', { search: `%${search}%` })
            .orWhere('student.student_code ILIKE :search', { search: `%${search}%` })
            .orWhere('instructor.first_name ILIKE :search', { search: `%${search}%` })
            .orWhere('instructor.last_name ILIKE :search', { search: `%${search}%` })
            .orWhere('instructor.instructor_code ILIKE :search', { search: `%${search}%` });
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

  async updateUser(id: string, updateDto: AdminUpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { user_uuid: id },
      relations: ['student', 'instructor'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // อัปเดตตารางหลัก (UserAccount) -> เช่น isActive
      if (updateDto.isActive !== undefined) {
        user.isActive = updateDto.isActive;
        await queryRunner.manager.save(user);
      }

      // อัปเดตข้อมูล Profile (แยกตาม Role)
      if (user.student) {
        if (updateDto.firstName) user.student.first_name = updateDto.firstName;
        if (updateDto.lastName) user.student.last_name = updateDto.lastName;
        if (updateDto.phone) user.student.phone = updateDto.phone;
        await queryRunner.manager.save(user.student);
      } else if (user.instructor) {
        if (updateDto.firstName) user.instructor.first_name = updateDto.firstName;
        if (updateDto.lastName) user.instructor.last_name = updateDto.lastName;
        // Instructor ไม่มี phone ใน Entity
        await queryRunner.manager.save(user.instructor);
      }

      await queryRunner.commitTransaction();

      // ส่งข้อมูลล่าสุดกลับไป
      return this.findOneUser(id);

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeUser(id: string) {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return { message: 'User deleted successfully' };
  }

  async createStudentByAdmin(dto: CreateStudentByAdminDto) {
    const existingUser = await this.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // เช็ค Student Code ซ้ำไหม
    const existingStudent = await this.dataSource.getRepository(Student).findOne({
      where: { student_code: dto.studentCode }
    });
    if (existingStudent) {
      throw new ConflictException('รหัสนักศึกษานี้มีอยู่ในระบบแล้ว');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // สร้าง UserAccount
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = queryRunner.manager.create(UserAccount, {
        email: dto.email,
        passwordHash: hashedPassword,
        role: 'student',
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);

      // สร้าง Student Data
      const student = queryRunner.manager.create(Student, {
        user_uuid: savedUser.user_uuid,
        student_code: dto.studentCode,
        prefix_name: dto.prefixName,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone || '',
      });
      await queryRunner.manager.save(student);

      await queryRunner.commitTransaction();

      const { passwordHash, ...result } = savedUser;
      return result;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createInstructorByAdmin(dto: CreateInstructorByAdminDto) {
    // เช็ค Instructor Code ซ้ำไหม
    const existingInstructor = await this.dataSource.getRepository(Instructor).findOne({
      where: { instructor_code: dto.instructorCode }
    });
    if (existingInstructor) {
      throw new ConflictException('รหัสอาจารย์นี้มีอยู่ในระบบแล้ว');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let savedUser: UserAccount | null = null;

      // เช็คว่า User กรอก Email มาไหม? (ถ้ากรอก = สร้าง UserAccount ด้วย)
      if (dto.email && dto.password) {
        // เช็ค Email ซ้ำ
        const existingUser = await this.usersRepository.findOne({ where: { email: dto.email } });
        if (existingUser) {
          throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = queryRunner.manager.create(UserAccount, {
          email: dto.email,
          passwordHash: hashedPassword,
          role: 'instructor',
          isActive: true,
        });
        savedUser = await queryRunner.manager.save(user);
      }

      // สร้าง Instructor Data
      const instructor = queryRunner.manager.create(Instructor, {
        instructor_code: dto.instructorCode,
        first_name: dto.firstName,
        last_name: dto.lastName,
        user_uuid: savedUser ? savedUser.user_uuid : null, // ถ้าไม่มี User ก็เป็น null ได้
      });

      await queryRunner.manager.save(instructor);

      await queryRunner.commitTransaction();

      return {
        message: 'สร้างข้อมูลอาจารย์สำเร็จ',
        hasAccount: !!savedUser,
        instructor: instructor
      };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllInstructors(page: number = 1, limit: number = 10, search?: string) {
    const query = this.instructorRepository.createQueryBuilder('instructor');

    // Join ไปหา User (แบบ Left Join ถ้าไม่มี User ก็ไม่ error)
    query.leftJoinAndSelect('instructor.user', 'user');

    // Search Logic (ค้นหาจากชื่อ หรือ รหัสอาจารย์)
    if (search) {
      query.where(new Brackets((qb) => {
        qb.where('instructor.first_name ILIKE :search', { search: `%${search}%` })
          .orWhere('instructor.last_name ILIKE :search', { search: `%${search}%` })
          .orWhere('instructor.instructor_code ILIKE :search', { search: `%${search}%` })
      }));
    }

    query.orderBy('instructor.create_at', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [instructors, total] = await query.getManyAndCount();

    // จัด Format ข้อมูลส่งกลับ
    const result = instructors.map(inst => ({
      instructor_uuid: inst.instructor_uuid,
      instructor_code: inst.instructor_code,
      firstName: inst.first_name,
      lastName: inst.last_name,
      hasAccount: !!inst.user,
      email: inst.user?.email || null,
      user_uuid: inst.user?.user_uuid || null
    }));

    return {
      data: result,
      meta: {
        totalItems: total,
        itemCount: instructors.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async findOneInstructor(instructorId: string) {
    const instructor = await this.instructorRepository.findOne({
      where: { instructor_uuid: instructorId },
      relations: ['user']
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${instructorId}" not found`);
    }

    return {
      ...instructor,
      user: instructor.user ? {
        email: instructor.user.email,
        isActive: instructor.user.isActive,
        user_uuid: instructor.user.user_uuid
      } : null
    };
  }

  async updateInstructor(instructorId: string, updateDto: AdminUpdateUserDto) {
    // หาข้อมูล Instructor + User
    const instructor = await this.instructorRepository.findOne({
      where: { instructor_uuid: instructorId },
      relations: ['user'],
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${instructorId}" not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // อัปเดตข้อมูลส่วนตัว (แก้ได้เสมอ)
      if (updateDto.firstName) instructor.first_name = updateDto.firstName;
      if (updateDto.lastName) instructor.last_name = updateDto.lastName;
      await queryRunner.manager.save(instructor);

      // Logic จัดการ User Account
      // กรณี A: ยัง "ไม่มี" User Account -> อนุญาตให้สร้างใหม่ได้
      if (!instructor.user) {
        if (updateDto.email && updateDto.password) {
          // เช็ค Email ซ้ำ
          const existingUser = await this.usersRepository.findOne({ where: { email: updateDto.email } });
          if (existingUser) {
            throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
          }

          // สร้าง User ใหม่
          const hashedPassword = await bcrypt.hash(updateDto.password, 10);
          const newUser = queryRunner.manager.create(UserAccount, {
            email: updateDto.email,
            passwordHash: hashedPassword,
            role: 'instructor',
            isActive: updateDto.isActive !== undefined ? updateDto.isActive : true,
          });

          const savedUser = await queryRunner.manager.save(newUser);

          // ผูก User ใหม่เข้ากับ Instructor เดิม
          instructor.user = savedUser;
          await queryRunner.manager.save(instructor);
        }
      }

      // กรณี B: "มี" User Account แล้ว -> ห้ามแก้ Email/Password (ทำได้แค่ isActive)
      else if (instructor.user) {
        // ต่อให้ส่ง email/password มาใน DTO ก็จะถูกเมิน (Ignored) ตรงนี้

        if (updateDto.isActive !== undefined) {
          instructor.user.isActive = updateDto.isActive;
          await queryRunner.manager.save(instructor.user);
        }
      }

      await queryRunner.commitTransaction();

      return this.findOneInstructor(instructorId);

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeInstructor(instructorId: string) {
    const instructor = await this.instructorRepository.findOne({
      where: { instructor_uuid: instructorId },
      relations: ['user'], // Load User มาด้วยเพื่อเตรียมลบ
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${instructorId}" not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // เก็บ user_uuid ไว้ก่อน (ถ้ามี)
      const userUuid = instructor.user?.user_uuid;

      // ลบข้อมูลในตาราง Instructor ก่อน
      await queryRunner.manager.delete(Instructor, instructorId);

      // ถ้ามี User Account ผูกอยู่ -> ลบ User Account ทิ้ง
      if (userUuid) {
        await queryRunner.manager.delete(UserAccount, userUuid);
      }

      await queryRunner.commitTransaction();

      return { message: 'Instructor deleted successfully' };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
