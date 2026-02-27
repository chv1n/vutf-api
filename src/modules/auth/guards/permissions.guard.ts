import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    
    // ถ้า API ไหนไม่ได้แปะ @RequirePermissions ไว้ ถือว่าผ่านได้
    if (!requiredPermissions) {
      return true; 
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // มาจาก JwtAuthGuard ตอน Login

    if (!user) return false;

    // Admin มีสิทธิ์ทำได้ทุกอย่าง ผ่านเสมอ!
    if (user.role === 'admin') {
      return true;
    }

    // แปลงสิทธิ์ของ User ที่ดึงมาจากตาราง ให้อยู่ในรูปแบบ 'action:resource' เพื่อให้เช็คง่ายๆ
    // ตัวอย่าง: { action: 'manage', resource: 'users' } จะกลายเป็น 'manage:users'
    const userPermissions = user.permissions?.map((p: any) => `${p.action}:${p.resource}`) || [];

    // เช็คว่า User มีสิทธิ์ตรงกับที่ API ต้องการอย่างน้อย 1 สิทธิ์หรือไม่
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ในการใช้งานส่วนนี้');
    }

    return true;
  }
}