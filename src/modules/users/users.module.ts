import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserAccount } from './entities/user-account.entity';
import { Student } from './entities/student.entity';
import { Instructor } from './entities/instructor.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserAccount, Student, Instructor]),
  PermissionsModule,
  SharedModule, 
  AuditLogModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
