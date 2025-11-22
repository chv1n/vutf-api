import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RedisService } from '../../shared/services/redis.service';
import { MailService } from '../../shared/services/mail.service';
import { OtpService } from '../../shared/services/otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
    private otpService: OtpService,
  ) { }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. เรียกใช้ UsersService เพื่อหาข้อมูล
    const user = await this.usersService.findByEmail(email);

    // 2. Validate Password
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // โยน Error เดี๋ยว Filter จะจัดการ format ให้ตามกฎข้อ 3
      throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกระงับ');
    }

    // 3. Prepare Payload
    const payload = { userId: user.user_id, role: user.role };

    // 4. Generate Tokens
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET
    });

    // 5. Store Refresh Token in Redis
    await this.redisService.set(
      `refresh_token:${user.user_id}`,
      refreshToken,
      7 * 24 * 60 * 60, // 7 days
    );

    // 6. Return Data (เฉพาะ data ส่วน success: true จะถูกห่อโดย Interceptor)
    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    };
  }

  async requestRegistrationOtp(dto: RequestOtpDto): Promise<void> {
    const { email } = dto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }

    const otp = this.otpService.generate6Digits();
    const ttl = 300;

    await this.redisService.set(`reg-otp:${email}`, otp, ttl);

    await this.mailService.sendRegistrationOtp(email, otp);
  }

  async verifyRegistrationOtp(dto: VerifyOtpDto) {
    const { email, otp } = dto;

    const storedOtp = await this.redisService.get(`reg-otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    const registrationToken = this.jwtService.sign(
      { email, isVerified: true },
      { expiresIn: '10m', secret: process.env.JWT_ACCESS_SECRET }
    );

    await this.redisService.del(`reg-otp:${email}`);

    return { registrationToken };
  }
}