import { Module } from '@nestjs/common';
import { AdvisorAssignmentService } from './advisor-assignment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { ThesisGroupModule } from '../thesis-group/thesis-group.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvisorAssignment]),
  ],
  providers: [AdvisorAssignmentService],
  exports: [AdvisorAssignmentService],
})
export class AdvisorAssignmentModule { }
