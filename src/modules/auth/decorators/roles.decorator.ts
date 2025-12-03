import { SetMetadata } from '@nestjs/common';

// Key สำหรับไว้อ้างอิง
export const ROLES_KEY = 'roles';

// Decorator ชื่อ @Roles() รับค่าเป็น array ของ string (เช่น 'admin', 'student')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);