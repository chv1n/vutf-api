import { Module } from '@nestjs/common';
import { GroupMemberService } from './group-member.service';
import { GroupMemberController } from './group-member.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from './entities/group-member.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupMember, ThesisGroup]),
    UsersModule
  ],
  controllers: [GroupMemberController],
  providers: [GroupMemberService],
  exports: [GroupMemberService],
})
export class GroupMemberModule { }

