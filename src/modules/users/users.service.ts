import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserAccount } from './entities/user-account.entity';
import { Student } from './entities/student.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,
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
}
