import { Module } from '@nestjs/common';
import { AdvisorAssignmentService } from './advisor-assignment.service';
import { AdvisorAssignmentController } from './advisor-assignment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { GroupMember } from '../group-member/entities/group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvisorAssignment, GroupMember]),
  ],
  controllers: [AdvisorAssignmentController],
  providers: [AdvisorAssignmentService],
  exports: [AdvisorAssignmentService],
})
export class AdvisorAssignmentModule { }
