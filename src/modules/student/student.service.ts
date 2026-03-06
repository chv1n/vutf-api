// src/modules/student/student.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { UserAccount } from '../users/entities/user-account.entity';
import { Student } from '../users/entities/student.entity';

import { InviteStudentsDto } from './dto/invite-students.dto';
import { SetupStudentProfileDto } from './dto/setup-student-profile.dto';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

import { MailService } from '../../shared/services/mail.service';
import { QueryHelper, PaginatedResponse } from '../../common/helpers';
import { StudentResponse } from './interfaces';

// ==================== Constants ====================
const STUDENT_SORT_FIELDS = ['student_code', 'first_name', 'last_name', 'create_at', 'email'];
const STUDENT_SEARCH_FIELDS = [
  'student.student_code',
  'student.first_name',
  'student.last_name',
  'student.phone',
  'user.email',
];
const STUDENT_FIELD_MAPPING = { email: 'user.email' };

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,

    @InjectRepository(Student)
    private studentRepository: Repository<Student>,

    private dataSource: DataSource,
    private mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }


  async findAll(query: GetStudentsQueryDto): Promise<PaginatedResponse<StudentResponse>> {
    console.log("hello stu find all")
    const { page = 1, limit = 10, sortBy = 'create_at', sortOrder = 'DESC' } = query;

    const queryBuilder = this.createBaseQuery();

    this.applySearch(queryBuilder, query.search);
    this.applyFilters(queryBuilder, query);
    QueryHelper.applySorting(queryBuilder, 'student', {
      sortBy,
      sortOrder: sortOrder.toUpperCase() as 'ASC' | 'DESC',
      validFields: STUDENT_SORT_FIELDS,
      defaultField: 'create_at',
      fieldMapping: STUDENT_FIELD_MAPPING,
    });
    QueryHelper.applyPagination(queryBuilder, { page, limit });

    const [students, total] = await queryBuilder.getManyAndCount();
    return QueryHelper.createPaginatedResponse(
      students.map(this.mapToResponse),
      total,
      page,
      limit,
    );
  }


  private createBaseQuery() {
    return this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user');
  }

  private applySearch(queryBuilder: ReturnType<typeof this.createBaseQuery>, search?: string) {
    QueryHelper.applySearch(queryBuilder, search, STUDENT_SEARCH_FIELDS);
  }

  private applyFilters(queryBuilder: ReturnType<typeof this.createBaseQuery>, query: GetStudentsQueryDto) {
    const { prefixName, studentCode, isActive } = query;

    if (prefixName) {
      queryBuilder.andWhere('student.prefix_name = :prefixName', { prefixName });
    }
    if (studentCode) {
      queryBuilder.andWhere('student.student_code = :studentCode', { studentCode });
    }
    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }
  }

  private mapToResponse = (student: Student): StudentResponse => ({
    student_uuid: student.student_uuid,
    student_code: student.student_code,
    prefix_name: student.prefix_name,
    first_name: student.first_name,
    last_name: student.last_name,
    full_name: `${student.prefix_name}${student.first_name} ${student.last_name}`,
    phone: student.phone,
    email: student.user?.email || null,
    is_active: student.user?.isActive || false,
    create_at: student.create_at,
    sectionId: student.section?.section_id,
    sectionName: student.section?.section_name,
  });

  async studentRegister(
    email: string,
    passwordHash: string,
    studentData: {
      prefixName: string;
      firstName: string;
      lastName: string;
      phone: string;
      sectionId: number;
    },
  ): Promise<UserAccount> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOne(UserAccount, { where: { email } });
      let userToSave: UserAccount;

      if (existingUser) {
        if (existingUser.passwordHash === null) {
          existingUser.passwordHash = passwordHash;
          existingUser.isActive = true;
          userToSave = existingUser;
        } else {
          throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
        }
      } else {
        userToSave = queryRunner.manager.create(UserAccount, {
          email,
          passwordHash,
          role: 'student',
          isActive: true,
        });
      }

      const savedUser = await queryRunner.manager.save(userToSave);

      const studentCode = email.split('@')[0];
      const formattedStudentCode = `${studentCode.slice(0, -1)}-${studentCode.slice(-1)}`;

      const existingStudent = await queryRunner.manager.findOne(Student, {
        where: { user_uuid: savedUser.user_uuid }
      });

      if (existingStudent) {
        existingStudent.prefix_name = studentData.prefixName;
        existingStudent.first_name = studentData.firstName;
        existingStudent.last_name = studentData.lastName;
        existingStudent.phone = studentData.phone;
        existingStudent.student_code = formattedStudentCode;
        existingStudent.section_id = studentData.sectionId;
        await queryRunner.manager.save(existingStudent);
      } else {
        const student = queryRunner.manager.create(Student, {
          user_uuid: savedUser.user_uuid,
          prefix_name: studentData.prefixName,
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          phone: studentData.phone,
          student_code: formattedStudentCode,
          section_id: studentData.sectionId,
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

  async inviteStudents(dto: InviteStudentsDto) {
    const results: { email: string; status: string; reason?: string; link?: string }[] = [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const email of dto.emails) {
        const existingUser = await this.usersRepository.findOne({ where: { email } });
        let userToInvite: UserAccount;

        if (existingUser) {
          if (existingUser.passwordHash === null) {
            userToInvite = existingUser;
          } else {
            results.push({ email, status: 'failed', reason: 'Email already exists and active' });
            continue;
          }
        } else {
          userToInvite = queryRunner.manager.create(UserAccount, {
            email: email,
            passwordHash: null,
            role: 'student',
            isActive: true,
          });
          await queryRunner.manager.save(userToInvite);
        }

        const payload = { userId: userToInvite.user_uuid };
        const inviteToken = this.jwtService.sign(payload, {
          expiresIn: '7d'
        });

        const frontendUrls = this.configService.get<string>('FRONTEND_URL') || '';
        const urlList = frontendUrls.split(',');
        const primaryUrl = urlList[1];
        const setupLink = `${primaryUrl}/setup-profile?token=${inviteToken}`;

        try {
          await this.mailService.sendInviteStudent(email, setupLink);
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
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({
        where: { user_uuid: payload.userId },
        relations: ['student']
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.student || user.passwordHash) {
        return { isValid: true, isSetup: true, email: user.email };
      }

      return { isValid: true, isSetup: false, email: user.email };
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async setupStudentProfile(dto: SetupStudentProfileDto) {
    let userId: string;
    try {
      const payload = this.jwtService.verify(dto.token);
      userId = payload.userId;
    } catch (error) {
      throw new BadRequestException('ลิงก์คำเชิญนี้หมดอายุ หรือไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่');
    }

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
        section_id: dto.section_id,
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

  // ----------------------------------------------------------------
  // 📍 Student Self-Service Features
  // ----------------------------------------------------------------

  /**
   * ดึงข้อมูล Profile ของนักศึกษาที่ Login อยู่
   * @param userId user_uuid จาก JWT Payload
   */
  async getProfile(userId: string): Promise<StudentResponse> {
    const student = await this.studentRepository.findOne({
      where: { user_uuid: userId },
      relations: ['user', 'section'],
    });

    if (!student) {
      throw new NotFoundException('ไม่พบข้อมูลนักศึกษาในระบบ');
    }

    return this.mapToResponse(student);
  }

  /**
   * แก้ไขข้อมูลส่วนตัวของนักศึกษา (เฉพาะ field ที่อนุญาต)
   * @param userId user_uuid จาก JWT Payload
   * @param dto ข้อมูลที่ต้องการแก้ไข
   */
  async updateProfile(userId: string, dto: UpdateStudentProfileDto): Promise<StudentResponse> {
    const student = await this.studentRepository.findOne({
      where: { user_uuid: userId },
      relations: ['user', 'section']
    });

    if (!student) {
      throw new NotFoundException('ไม่พบข้อมูลนักศึกษา');
    }

    if (dto.prefixName) student.prefix_name = dto.prefixName;
    if (dto.firstName) student.first_name = dto.firstName;
    if (dto.lastName) student.last_name = dto.lastName;
    if (dto.phone) student.phone = dto.phone;

    const updatedStudent = await this.studentRepository.save(student);
    return this.mapToResponse(updatedStudent);
  }
}