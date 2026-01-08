import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../shared/services/redis.service';
import { MailService } from '../../shared/services/mail.service';
import { OtpService } from '../../shared/services/otp.service';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let redisService: Partial<RedisService>;
  let mailService: Partial<MailService>;
  let otpService: Partial<OtpService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      studentRegister: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
      verifyAsync: jest.fn(),
      verify: jest.fn(),
    };
    redisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
    mailService = {
      sendRegistrationOtp: jest.fn(),
    };
    otpService = {
      generate6Digits: jest.fn().mockReturnValue('123456'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
        { provide: OtpService, useValue: otpService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens if login is successful', async () => {
      const user = {
        user_uuid: 'uuid',
        email: 'test@test.com',
        passwordHash: 'hashed',
        isActive: true,
        role: 'student',
      };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token');

      const result = await service.login({ email: 'test@test.com', password: 'password' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw BadRequestException if password is wrong', async () => {
      const user = {
        user_uuid: 'uuid',
        email: 'test@test.com',
        passwordHash: 'hashed',
        isActive: true,
      };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens if refresh token is valid', async () => {
      const payload = { userId: 'uuid', role: 'student' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
      (redisService.get as jest.Mock).mockResolvedValue('valid_refresh_token');
      (jwtService.sign as jest.Mock).mockReturnValue('new_token');

      const result = await service.refresh({ refreshToken: 'valid_refresh_token' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error());

      await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestRegistrationOtp', () => {
    it('should send OTP if email is not registered', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await service.requestRegistrationOtp({ email: 'new@test.com' });

      expect(otpService.generate6Digits).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
      expect(mailService.sendRegistrationOtp).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({});

      await expect(service.requestRegistrationOtp({ email: 'exist@test.com' })).rejects.toThrow(ConflictException);
    });
  });
});
