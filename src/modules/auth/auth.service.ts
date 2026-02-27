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
import { AuditLogService } from '../audit-log/audit-log.service';

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
    private readonly auditLogService: AuditLogService,
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
      permissions: user.permissions || []
    };
  }

  async login(loginDto: LoginDto, ip: string) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    // -------------------------------------------------------------
    // 1. เช็คว่า IP หรือ Email นี้โดนล็อคชั่วคราวอยู่หรือไม่ (Rate Limiting)
    // -------------------------------------------------------------
    const loginAttemptsKey = `login_attempts:${email}`;
    const maxAttempts = 5; // จำนวนครั้งที่ยอมให้ผิดได้
    const lockoutDuration = 15 * 60; // ล็อค 15 นาที (หน่วยเป็นวินาที)

    const attemptsStr = await this.redisService.get(loginAttemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (attempts >= maxAttempts) {
      throw new UnauthorizedException('คุณพยายามเข้าสู่ระบบผิดพลาดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
    }

    // -------------------------------------------------------------
    // 2. เช็คว่ามีอีเมลนี้ในระบบหรือไม่
    // -------------------------------------------------------------
    if (!user || !user.passwordHash) {
      throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // -------------------------------------------------------------
    // 3. เช็คสถานะบัญชี (ต้องเช็คก่อนตรวจรหัสผ่าน)
    // -------------------------------------------------------------
    if (!user.isActive) {
      // LOG: บันทึกว่ามีคนพยายามเข้าบัญชีที่ถูกระงับ
      await this.auditLogService.createLog(user.user_uuid, 'LOGIN_FAILED', 'พยายามเข้าสู่ระบบด้วยบัญชีที่ถูกระงับ', null, ip).catch(() => { });
      throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน');
    }

    // -------------------------------------------------------------
    // 4. ตรวจสอบรหัสผ่าน (พร้อมเก็บ Log ถ้าผิดพลาด)
    // -------------------------------------------------------------
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const currentFails = attempts + 1;
      const remainingAttempts = maxAttempts - currentFails;

      // นับการเข้าสู่ระบบผิดพลาดใน Redis
      await this.redisService.set(loginAttemptsKey, currentFails.toString(), lockoutDuration);

      // LOG: บันทึกว่าใส่รหัสผ่านผิด
      await this.auditLogService.createLog(
        user.user_uuid,
        'LOGIN_FAILED',
        `รหัสผ่านไม่ถูกต้อง (ครั้งที่ ${currentFails}/${maxAttempts})`,
        null,
        ip
      ).catch(() => { });

      // --- UX & Security Response Logic ---
      if (remainingAttempts === 0) {
        throw new UnauthorizedException('คุณพยายามเข้าสู่ระบบผิดพลาดหลายครั้งเกินไป บัญชีถูกระงับชั่วคราว 15 นาที');
      } else if (remainingAttempts <= 2) {
        throw new BadRequestException(`อีเมลหรือรหัสผ่านไม่ถูกต้อง (คุณเหลือโอกาสอีก ${remainingAttempts} ครั้ง)`);
      } else {
        throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    }

    // -------------------------------------------------------------
    // ล็อกอินสำเร็จ: ลบตัวนับความผิดพลาดทิ้ง และไปต่อ
    // -------------------------------------------------------------
    await this.redisService.del(loginAttemptsKey);

    // Prepare Payload
    const payload = { userId: user.user_uuid, role: user.role };

    // Generate Tokens
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

    // LOG: บันทึกว่าล็อกอินสำเร็จ
    try {
      await this.auditLogService.createLog(
        user.user_uuid,
        'LOGIN',
        'เข้าสู่ระบบสำเร็จ',
        null,
        ip
      );
    } catch (error) {
      console.error('Login Log Error:', error.message);
    }
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

  async register(dto: RegisterDto, registrationToken: string, ip: string) {
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

    try {
      await this.auditLogService.createLog(
        user.user_uuid,
        'REGISTER',
        'ลงทะเบียนสมาชิกใหม่',
        { email: email, role: 'student' },
        ip
      );
    } catch (error) {
      console.error('Audit Log Error:', error.message);
    }

    return user;
  }


  async requestForgotPasswordOtp(dto: ForgotPasswordDto, ip: string): Promise<void> {
    const { email } = dto;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('ไม่พบอีเมลนี้ในระบบ');
    }

    // -------------------------------------------------------------
    // Rate Limit ป้องกันการสแปมขอ OTP
    // -------------------------------------------------------------
    const otpRateLimitKey = `rate_limit:forgot_otp:${email}`;
    const maxOtpRequests = 3; // อนุญาตให้กดขอ OTP ได้ 3 ครั้ง
    const lockoutDuration = 15 * 60; // ถ้าขอเกิน ให้บล็อกการส่งอีเมล 15 นาที

    // เช็คว่าขอไปกี่ครั้งแล้ว
    const requestCountStr = await this.redisService.get(otpRateLimitKey);
    const requestCount = requestCountStr ? parseInt(requestCountStr, 10) : 0;

    if (requestCount >= maxOtpRequests) {
      throw new BadRequestException('คุณขอรหัส OTP บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
    }

    // บวกจำนวนครั้งเพิ่มเข้าไปใน Redis
    await this.redisService.set(otpRateLimitKey, (requestCount + 1).toString(), lockoutDuration);
    // -------------------------------------------------------------

    const otp = this.otpService.generate6Digits();
    const ttl = 300; // ตัว OTP มีอายุ 5 นาที

    await this.redisService.set(`forgot-otp:${email}`, otp, ttl);
    await this.mailService.sendForgotPassword(email, otp);

    try {
      await this.auditLogService.createLog(
        user.user_uuid,
        'FORGOT_PASSWORD_REQUEST',
        `ขอรหัส OTP สำหรับรีเซ็ตรหัสผ่าน (ครั้งที่ ${requestCount + 1}/${maxOtpRequests})`,
        { email },
        ip
      );
    } catch (error) {
      console.error('Audit Log Error:', error.message);
    }
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

  async resetPassword(dto: ResetPasswordDto, resetToken: string, ip: string) {
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

    const user = await this.usersService.findByEmail(email);
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.updatePassword(email, hashedPassword);

    const loginAttemptsKey = `login_attempts:${email}`;
    await this.redisService.del(loginAttemptsKey);

    if (user) {
      try {
        await this.auditLogService.createLog(
          user.user_uuid,
          'RESET_PASSWORD',
          'เปลี่ยนรหัสผ่านสำเร็จ',
          null,
          ip
        );
      } catch (error) {
        console.error('Audit Log Error:', error.message);
      }
    }

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' };
  }
}
