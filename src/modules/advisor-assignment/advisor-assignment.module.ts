// src/modules/advisor-assignment/advisor-assignment.module.ts
import { Module } from '@nestjs/common';
import { AdvisorAssignmentService } from './advisor-assignment.service';
import { AdvisorAssignmentController } from './advisor-assignment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { GroupMemberModule } from '../group-member/group-member.module';
import { UsersModule } from '../users/users.module';
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { StorageModule } from '../../common/modules/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvisorAssignment, GroupMember, ThesisGroup, InspectionRound, Submission]),
    GroupMemberModule,
    UsersModule,
    StorageModule,
  ],
  controllers: [AdvisorAssignmentController],
  providers: [AdvisorAssignmentService],
  exports: [AdvisorAssignmentService],
})
export class AdvisorAssignmentModule { }