import * as bcrypt from 'bcrypt';
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Student } from './entities/student.entity';
import { Instructor } from './entities/instructor.entity';
import { GetUsersFilterDto, UserRoleFilter } from './dto/get-users-filter.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';
import { InviteStudentsDto } from './dto/invite-students.dto';
import { SetupStudentProfileDto } from './dto/setup-student-profile.dto';
import { MailService } from '../../shared/services/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,

    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
    private dataSource: DataSource,

    private mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
      // 1. เช็คก่อนว่ามี User นี้รออยู่แล้วไหม (กรณี Invite)
      // ใช้ manager.findOne เพื่อให้มันอยู่ภายใต้ Transaction เดียวกัน
      const existingUser = await queryRunner.manager.findOne(UserAccount, { where: { email } });

      let userToSave: UserAccount;

      if (existingUser) {
        // กรณี A: เจอ User แต่ Password เป็น Null (คือคนที่ถูก Invite ไว้)
        if (existingUser.passwordHash === null) {
          // เอา User เดิมมาใส่รหัสผ่าน แล้ว Save ทับ (Update)
          existingUser.passwordHash = passwordHash;
          existingUser.isActive = true;
          userToSave = existingUser;
        }
        // กรณี B: เจอ User และมี Password แล้ว (แปลว่าซ้ำจริง)
        else {
          throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
        }
      } else {
        // กรณี C: ไม่เจอ User เลย (สมัครใหม่ปกติ)
        userToSave = queryRunner.manager.create(UserAccount, {
          email,
          passwordHash,
          role: 'student',
          isActive: true,
        });
      }

      // 2. Save User (TypeORM จะรู้เองว่าถ้ามี ID คือ Update, ถ้าไม่มีคือ Insert)
      const savedUser = await queryRunner.manager.save(userToSave);

      // คำนวณรหัสนักศึกษา
      const studentCode = email.split('@')[0];
      const formattedStudentCode = `${studentCode.slice(0, -1)}-${studentCode.slice(-1)}`;

      // 3. สร้างข้อมูล Student
      // เช็คกันเหนียวว่ามี Student Data ค้างอยู่ไหม (ปกติไม่ควรมีถ้า Invite มาแค่ UserAccount)
      const existingStudent = await queryRunner.manager.findOne(Student, {
        where: { user_uuid: savedUser.user_uuid }
      });

      if (existingStudent) {
        // ถ้ามีข้อมูลอยู่แล้ว อาจจะ Update ทับ หรือ Throw Error ตาม Business Logic
        // ในที่นี้ขอ Update ทับข้อมูลเดิมไปเลย
        existingStudent.prefix_name = studentData.prefixName;
        existingStudent.first_name = studentData.firstName;
        existingStudent.last_name = studentData.lastName;
        existingStudent.phone = studentData.phone;
        existingStudent.student_code = formattedStudentCode;

        await queryRunner.manager.save(existingStudent);
      } else {
        // ถ้ายังไม่มี Student Data
        const student = queryRunner.manager.create(Student, {
          user_uuid: savedUser.user_uuid,
          prefix_name: studentData.prefixName,
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          phone: studentData.phone,
          student_code: formattedStudentCode,
        });
        await queryRunner.manager.save(student);
      }

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

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.usersRepository.findOne({ 
        where: { user_uuid: id },
        relations: ['student', 'instructor'] // Load ความสัมพันธ์มาด้วย
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
          // ถ้าเป็นนักเรียน และมีข้อมูล Profile อยู่แล้ว
          if (dto.prefixName) user.student.prefix_name = dto.prefixName;
          if (dto.firstName) user.student.first_name = dto.firstName;
          if (dto.lastName) user.student.last_name = dto.lastName;
          if (dto.phone) user.student.phone = dto.phone;
          if (dto.studentCode) user.student.student_code = dto.studentCode;
          
          await queryRunner.manager.save(user.student);
      } 
      else if (user.role === 'instructor' && user.instructor) {
          // ถ้าเป็นอาจารย์
          if (dto.firstName) user.instructor.first_name = dto.firstName;
          if (dto.lastName) user.instructor.last_name = dto.lastName;
          if (dto.instructorCode) user.instructor.instructor_code = dto.instructorCode;
          
          await queryRunner.manager.save(user.instructor);
      }

      await queryRunner.commitTransaction();
      return this.findOneUser(id); // ส่งข้อมูลล่าสุดกลับไป

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

  async inviteStudents(dto: InviteStudentsDto) {
    const results: { email: string; status: string; reason?: string; link?: string }[] = [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const email of dto.emails) {
        // 1. หา User เดิม
        const existingUser = await this.usersRepository.findOne({ where: { email } });

        let userToInvite: UserAccount;

        if (existingUser) {
          // กรณี A: มี User แล้ว แต่ยังไม่มีรหัสผ่าน (คือคนที่ Token หมดอายุ หรือยังไม่กดรับ)
          if (existingUser.passwordHash === null) {
            userToInvite = existingUser;
          }
          // กรณี B: มี User และมีรหัสผ่านแล้ว (เป็นสมาชิกสมบูรณ์แล้ว)
          else {
            results.push({ email, status: 'failed', reason: 'Email already exists and active' });
            continue; // ข้ามไปคนถัดไป
          }
        } else {
          // กรณี C: ยังไม่เคยมีในระบบ -> สร้างใหม่
          userToInvite = queryRunner.manager.create(UserAccount, {
            email: email,
            passwordHash: null,
            role: 'student',
            isActive: true,
          });
          await queryRunner.manager.save(userToInvite);
        }

        // --- สร้าง Token ใหม่ (ไม่ว่าจะ User เก่าหรือใหม่ ก็จะได้ Token สดใหม่เสมอ) ---
        const payload = { userId: userToInvite.user_uuid };
        const inviteToken = this.jwtService.sign(payload, {
          expiresIn: '7d'
        });

        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const setupLink = `${frontendUrl}/setup-profile?token=${inviteToken}`;

        try {
          await this.mailService.sendInviteStudent(email, setupLink);
          // แยก status ให้ดูง่ายๆ ว่า สร้างใหม่ (success) หรือ ส่งซ้ำ (resent)
          const status = existingUser ? 'resent' : 'success';
          results.push({ email, status: status, link: setupLink });
        } catch (mailError) {
          console.error(`Failed to send email to ${email}`, mailError);
          results.push({ email, status: 'warning', reason: 'User prepared but email failed', link: setupLink });
        }
      }

      await queryRunner.commitTransaction();
      return { message: 'Processed invitations', results };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async validateInviteToken(token: string) {
    try {
      // ถอดรหัส Token
      const payload = this.jwtService.verify(token);

      // หา User
      const user = await this.usersRepository.findOne({
        where: { user_uuid: payload.userId },
        relations: ['student'] // Load student มาเช็คด้วย
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // เช็คสถานะ: ถ้ามี Student Profile แล้ว หรือตั้งรหัสผ่านแล้ว = สมัครเสร็จแล้ว
      if (user.student || user.passwordHash) {
        return {
          isValid: true,
          isSetup: true, 
          email: user.email
        };
      }

      // ถ้ายังไม่สมัคร
      return {
        isValid: true,
        isSetup: false,
        email: user.email
      };

    } catch (error) {
      // ถ้า Token หมดอายุ หรือ แกะไม่ออก
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async setupStudentProfile(dto: SetupStudentProfileDto) {

    let userId: string;

    // 1. ตรวจสอบ Token (ถ้าหมดอายุ หรือถูกแก้ จะ Error ตรงนี้)
    try {
      const payload = this.jwtService.verify(dto.token); // ใช้ Secret จาก Module อัตโนมัติ
      userId = payload.userId;
    } catch (error) {
      throw new BadRequestException('ลิงก์คำเชิญนี้หมดอายุ หรือไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่');
    }

    // 2. ใช้ userId ที่แกะได้ไปหา User
    const user = await this.usersRepository.findOne({
      where: { user_uuid: userId },
      relations: ['student']
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.student) throw new ConflictException('บัญชีนี้ได้ทำการลงทะเบียนเสร็จสมบูรณ์ไปแล้ว');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const salt = await bcrypt.genSalt();
      user.passwordHash = await bcrypt.hash(dto.password, salt);
      user.isActive = true;
      await queryRunner.manager.save(user);

      const rawCode = user.email.split('@')[0];
      const formattedStudentCode = `${rawCode.slice(0, -1)}-${rawCode.slice(-1)}`;

      const student = queryRunner.manager.create(Student, {
        user_uuid: user.user_uuid,
        student_code: formattedStudentCode,
        prefix_name: dto.prefixName,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone,
      });

      await queryRunner.manager.save(student);
      await queryRunner.commitTransaction();

      return {
        message: 'Setup profile successful',
        studentCode: formattedStudentCode,
        user_uuid: user.user_uuid
      };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createInstructorByAdmin(dto: CreateInstructorByAdminDto) {
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

      // 2. แก้ไข: ต้องระบุ Type ให้ชัดเจนว่าเป็น string หรือ null
      let passwordHashToUse: string | null = null;

      if (!emailToUse) {
        emailToUse = `pending_${dto.instructorCode}_${Date.now()}@example.rmutt`;
      } else {
        const existingUser = await this.usersRepository.findOne({ where: { email: emailToUse } });
        if (existingUser) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
      }

      if (dto.password) {
        passwordHashToUse = await bcrypt.hash(dto.password, 10);
      }

      const user = queryRunner.manager.create(UserAccount, {
        email: emailToUse,
        passwordHash: passwordHashToUse,
        role: 'instructor',
        isActive: true,
      });

      const savedUser = await queryRunner.manager.save(user);

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
      user_uuid: inst.user?.user_uuid || null,
      isActive: inst.user?.isActive
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
    const instructor = await this.instructorRepository.findOne({
      where: { instructor_uuid: instructorId },
      relations: ['user'],
    });

    if (!instructor) throw new NotFoundException(`Instructor not found`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // อัปเดตข้อมูลส่วนตัว (ชื่อ-สกุล)
      if (updateDto.firstName) instructor.first_name = updateDto.firstName;
      if (updateDto.lastName) instructor.last_name = updateDto.lastName;
      await queryRunner.manager.save(instructor);

      // อัปเดต User Account (เปลี่ยน Email/Password หรือ Status)
      if (instructor.user) {
        let userUpdated = false;

        // กรณีเปลี่ยน Status (isActive)
        if (updateDto.isActive !== undefined) {
          instructor.user.isActive = updateDto.isActive;
          userUpdated = true;
        }

        // กรณีจะตั้งค่า Email/Password (เช่น จากเดิมไม่มี หรือเปลี่ยนใหม่)
        if (updateDto.email) {
          // เช็คว่า Email ซ้ำคนอื่นไหม (ยกเว้นซ้ำกับตัวเอง)
          const existingUser = await this.usersRepository.findOne({ where: { email: updateDto.email } });
          if (existingUser && existingUser.user_uuid !== instructor.user.user_uuid) {
            throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
          }

          instructor.user.email = updateDto.email;
          userUpdated = true;
        }

        if (updateDto.password) {
          instructor.user.passwordHash = await bcrypt.hash(updateDto.password, 10);
          userUpdated = true;
        }

        if (userUpdated) {
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
      relations: ['user'],
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${instructorId}" not found`);
    }

    // ถ้ามี User Account ผูกอยู่ ให้ Deactivate User นั้น
    if (instructor.user) {
      instructor.user.isActive = false;
      await this.usersRepository.save(instructor.user);
    }

    return { message: 'Instructor account deactivated successfully' };
  }
}
