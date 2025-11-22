import { Controller, Get, UseGuards, Request} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(AuthGuard('jwt')) // <--- 🔒 ล็อคห้อง! ต้องมี Token ถึงจะเข้าได้
  @Get('profile')
  getProfile(@Request() req) {
    // req.user คือข้อมูลที่แกะได้จาก Token (มาจากไฟล์ jwt.strategy.ts)
    return req.user;
  }
}
