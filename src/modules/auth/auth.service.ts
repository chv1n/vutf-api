import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { StudentService } from '../student/student.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RedisService } from '../../shared/services/redis.service';
import { MailService } from '../../shared/services/mail.service';
import { OtpService } from '../../shared/services/otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private studentService: StudentService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
    private otpService: OtpService,
  ) { }

  async getMe(userId: string) {
    // ดึงข้อมูล User Account
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.user_uuid,
      email: user.email,
      role: user.role,
      firstName: user.student?.first_name || user.instructor?.first_name || '',
      lastName: user.student?.last_name || user.instructor?.last_name || '',
      code: user.student?.student_code || user.instructor?.instructor_code || '',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกระงับ');
    }

    // 3. Prepare Payload
    const payload = { userId: user.user_uuid, role: user.role };

    // 4. Generate Tokens
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET
    });

    await this.redisService.set(
      `refresh_token:${user.user_uuid}`,
      refreshToken,
      7 * 24 * 60 * 60, // 7 days
    );
    return {
      userId: user.user_uuid,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      // 1. ตรวจสอบ Signature
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // 2. เช็คใน Redis (แก้ไขจุดที่ 1: ใช้ this.redisService)
      const userId = payload.userId;
      const storedToken = await this.redisService.get(`refresh_token:${userId}`);

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token ไม่ถูกต้อง หรือหมดอายุแล้ว');
      }

      // 3. สร้าง Token คู่ใหม่
      const user = { user_id: userId, role: payload.role };
      const newPayload = { userId: user.user_id, role: user.role };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
        secret: process.env.JWT_ACCESS_SECRET
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET
      });

      // 4. อัปเดต Token ลง Redis (แก้ไขจุดที่ 2: ใช้ this.redisService และลบ 'EX' ออก)
      await this.redisService.set(
        `refresh_token:${userId}`,
        newRefreshToken,
        7 * 24 * 60 * 60,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };

    } catch (e) {
      throw new UnauthorizedException('Refresh token หมดอายุ กรุณา Login ใหม่');
    }
  }

  async requestRegistrationOtp(dto: RequestOtpDto): Promise<void> {
    const { email } = dto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.passwordHash !== null) {
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

  async register(dto: RegisterDto, registrationToken: string) {
    let email: string;
    try {
      const payload = this.jwtService.verify(registrationToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (!payload.isVerified) {
        throw new BadRequestException('Invalid registration token.');
      }
      email = payload.email;
    } catch (error) {
      throw new BadRequestException('Invalid or expired registration token.');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.passwordHash !== null) {
      throw new ConflictException('This email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.studentService.studentRegister(email, hashedPassword, {
      prefixName: dto.prefixName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      sectionId: dto.sectionId,
    });

    return user;
  }


  async requestForgotPasswordOtp(dto: ForgotPasswordDto): Promise<void> {
    const { email } = dto;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('ไม่พบอีเมลนี้ในระบบ');
    }

    const otp = this.otpService.generate6Digits();
    const ttl = 300; // 5 นาที

    await this.redisService.set(`forgot-otp:${email}`, otp, ttl);
    await this.mailService.sendForgotPassword(email, otp);
  }

  async verifyForgotPasswordOtp(dto: VerifyOtpDto) {
    const { email, otp } = dto;
    const storedOtp = await this.redisService.get(`forgot-otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('OTP ไม่ถูกต้องหรือหมดอายุ');
    }

    // สร้าง Token พิเศษสำหรับ Reset Password (อายุ 10 นาที)
    const resetToken = this.jwtService.sign(
      { email, isReset: true },
      { expiresIn: '10m', secret: process.env.JWT_ACCESS_SECRET }
    );

    await this.redisService.del(`forgot-otp:${email}`);

    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto, resetToken: string) {
    let email: string;
    try {
      const payload = this.jwtService.verify(resetToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (!payload.isReset) {
        throw new BadRequestException('Invalid reset token.');
      }
      email = payload.email;
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.updatePassword(email, hashedPassword);

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' };
  }
}
