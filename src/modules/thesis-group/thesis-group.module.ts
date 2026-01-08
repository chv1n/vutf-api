import { Module } from '@nestjs/common';
import { ThesisGroupService } from './thesis-group.service';
import { ThesisGroupController } from './thesis-group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisGroup } from './entities/thesis-group.entity';
import { GroupMemberModule } from '../group-member/group-member.module';
import { ThesisModule } from '../thesis/thesis.module';
import { AdvisorAssignmentModule } from '../advisor-assignment/advisor-assignment.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThesisGroup]),
    GroupMemberModule,
    ThesisModule,
    AdvisorAssignmentModule,
    UsersModule,
  ],
  controllers: [ThesisGroupController],
  providers: [ThesisGroupService],
  exports: [ThesisGroupService],
})
export class ThesisGroupModule {}
