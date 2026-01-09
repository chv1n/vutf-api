import { Module } from '@nestjs/common';
import { AdvisorAssignmentService } from './advisor-assignment.service';
import { AdvisorAssignmentController } from './advisor-assignment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { GroupMemberModule } from '../group-member/group-member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvisorAssignment, GroupMember, ThesisGroup]),
    GroupMemberModule,
  ],
  controllers: [AdvisorAssignmentController],
  providers: [AdvisorAssignmentService],
  exports: [AdvisorAssignmentService],
})
export class AdvisorAssignmentModule { }
