import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from './entities/user-account.entity';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(UserAccount)
    private usersRepository: Repository<UserAccount>,
  ) { }

  // ฟังก์ชันนี้ AuthModule จะเรียกใช้
  async findByEmail(email: string): Promise<UserAccount | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

}
