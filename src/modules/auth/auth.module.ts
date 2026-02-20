import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { StudentModule } from '../student/student.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    UsersModule,
    StudentModule,
    JwtModule.register({}),
    SharedModule,
    AuditLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule { }