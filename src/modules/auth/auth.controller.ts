import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000,
    });

    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ) {
    const registrationToken = req.cookies['registrationToken'];
    if (!registrationToken) {
      throw new BadRequestException('Registration token is missing.');
    }

    const user = await this.authService.register(registerDto, registrationToken);
    return user;
  }
}