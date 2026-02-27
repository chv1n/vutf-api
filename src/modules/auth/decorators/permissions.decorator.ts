import { SetMetadata } from '@nestjs/common';

// เราจะกำหนดสิทธิ์ในรูปแบบ 'action:resource' เช่น 'manage:users'
export const RequirePermissions = (...permissions: string[]) => SetMetadata('permissions', permissions);