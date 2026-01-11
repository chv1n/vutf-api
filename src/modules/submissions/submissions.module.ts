import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { Submission } from './entities/submission.entity';
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { StorageModule } from '../../common/modules/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      InspectionRound,
      ThesisGroup,
      GroupMember,
    ]),
    StorageModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule { }
