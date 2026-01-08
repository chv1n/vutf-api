// src/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // เช็คว่า API นี้มี @Public ติดไว้ไหม
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ถ้ามี @Public ให้ผ่านไปเลย (return true)
    if (isPublic) {
      return true;
    }

    // ถ้าไม่มี ก็ตรวจ JWT ตามปกติ
    return super.canActivate(context);
  }
}