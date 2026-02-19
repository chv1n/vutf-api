// src/modules/thesis-topic/thesis-topic.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisTopicService } from './thesis-topic.service';
import { ThesisTopicController } from './thesis-topic.controller';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Thesis, ThesisGroup]),
    NotificationsModule,
  ],
  controllers: [ThesisTopicController],
  providers: [ThesisTopicService],
})
export class ThesisTopicModule {}