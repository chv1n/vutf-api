import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      requestRegistrationOtp: jest.fn(),
      verifyRegistrationOtp: jest.fn(),
      register: jest.fn(),
      requestForgotPasswordOtp: jest.fn(),
      verifyForgotPasswordOtp: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return user info and set cookies', async () => {
      const loginDto = { email: 'test@test.com', password: 'password' };
      const result = {
        userId: 'uuid',
        email: 'test@test.com',
        role: 'student',
        accessToken: 'access',
        refreshToken: 'refresh',
      };
      (authService.login as jest.Mock).mockResolvedValue(result);

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const response = await controller.login(loginDto, res);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh', expect.any(Object));
      expect(response).toEqual({
        userId: 'uuid',
        email: 'test@test.com',
        role: 'student',
        message: 'Login successful',
      });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and update cookies', async () => {
      const req = { cookies: { refreshToken: 'old_refresh' } } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;
      const result = { accessToken: 'new_access', refreshToken: 'new_refresh' };

      (authService.refresh as jest.Mock).mockResolvedValue(result);

      await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith({ refreshToken: 'old_refresh' });
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'new_access', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new_refresh', expect.any(Object));
    });
  });

  describe('logout', () => {
    it('should clear cookies', async () => {
      const res = { clearCookie: jest.fn() } as unknown as Response;

      await controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });
});
