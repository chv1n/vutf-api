import { Controller, Post, Get, Body, HttpCode, HttpStatus, Res, Req, BadRequestException, UnauthorizedException, UseGuards, Ip } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production' || true; // บังคับ true ไว้ก่อนเพื่อเทสผ่าน Tunnel

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,       // ต้องเป็น true เท่านั้นเมื่อใช้ SameSite: 'none'
      sameSite: 'none',   // เปลี่ยนจาก 'lax' เป็น 'none' เพื่อให้ส่งข้ามโดเมนได้
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,       // ต้องเป็น true
      sameSite: 'none',   // ปลี่ยนเป็น 'none'
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @UseGuards(AuthGuard('jwt')) // ต้อง Login ก่อนถึงเข้าได้ (เช็คจาก Cookie)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req) {
    const userId = req.user.userId;
    return this.authService.getMe(userId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response
  ) {
    // 1. เรียก Service ได้ผลลัพธ์ที่มี tokens
    const result = await this.authService.login(loginDto, ip);

    // 2. แยก token ออกมาใส่ Cookie
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // 3. ส่งกลับไปแค่ข้อมูล User (ลบ sensitive token ออกจาก response body)
    return {
      userId: result.userId,
      email: result.email,
      role: result.role,
      message: 'Login successful'
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // 1. ดึง Refresh Token จาก Cookie
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    // 2. ส่งให้ Service ตรวจสอบ (ปรับรูปให้ตรงกับ DTO ที่ Service ต้องการ)
    const result = await this.authService.refresh({ refreshToken });

    // 3. อัปเดต Cookie ใหม่ (Rotation)
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { message: 'Token refreshed' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,     
      sameSite: 'none' as const,
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', {
      ...cookieOptions,
      path: '/api/v1/auth/refresh'
    });

    return { message: 'Logout successful' };
  }

  @Post('request-registration-otp')
  @HttpCode(HttpStatus.OK)
  async requestRegistrationOtp(@Body() requestOtpDto: RequestOtpDto) {
    await this.authService.requestRegistrationOtp(requestOtpDto);
    return { message: 'OTP sent to your email.' };
  }

  @Post('verify-registration-otp')
  @HttpCode(HttpStatus.OK)
  async verifyRegistrationOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyRegistrationOtp(verifyOtpDto);

    res.cookie('registrationToken', result.registrationToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 10 * 60 * 1000,
    });

    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const registrationToken = req.cookies['registrationToken'];
    if (!registrationToken) {
      throw new BadRequestException('Registration token is missing.');
    }

    const user = await this.authService.register(registerDto, registrationToken, ip);
    return user;
  }


  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string,) {
    return this.authService.requestForgotPasswordOtp(dto, ip);
  }

  @Post('verify-forgot-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyForgotPasswordOtp(dto);

    res.cookie('resetToken', result.resetToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 10 * 60 * 1000,
    });

    return { message: 'OTP verified, reset token set in cookie.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,     // Inject Request เพื่ออ่าน Cookie
    @Res({ passthrough: true }) res: Response, // Inject Response เพื่อลบ Cookie
    @Ip() ip: string,
  ) {

    const token = req.cookies['resetToken'];

    if (!token) {
      throw new BadRequestException('Reset token is missing in cookies.');
    }

    const result = await this.authService.resetPassword(dto, token, ip);

    // ลบ Cookie ทิ้งเมื่อเปลี่ยนรหัสเสร็จ
    res.clearCookie('resetToken');

    return result;
  }
}