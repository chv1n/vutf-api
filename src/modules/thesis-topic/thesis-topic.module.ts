// src/modules/thesis-topic/thesis-topic.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisTopicService } from './thesis-topic.service';
import { ThesisTopicController } from './thesis-topic.controller';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ThesisModule } from '../thesis/thesis.module';
import { GroupMemberModule } from '../group-member/group-member.module';
import { AdvisorAssignmentModule } from '../advisor-assignment/advisor-assignment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Thesis, ThesisGroup]),
    NotificationsModule,
    ThesisModule,
    GroupMemberModule,
    AdvisorAssignmentModule,
  ],
  controllers: [ThesisTopicController],
  providers: [ThesisTopicService],
})
export class ThesisTopicModule {}