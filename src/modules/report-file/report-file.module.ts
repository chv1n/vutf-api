// src/modules/report-file/report-file.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportFileService } from './report-file.service';
import { ReportFileController } from './report-file.controller';
import { ReportFile } from './entities/report-file.entity';
import { JobProducerService } from './services/job-producer.service';
import { ResultConsumerService } from './services/result-consumer.service';
import { VerificationService } from './services/verification.service';
import { RabbitmqModule } from '../../shared/rabbitmq/rabbitmq.module';
import { DocConfigModule } from '../doc-config/doc-config.module';
import { Submission } from '../submissions/entities/submission.entity';
import { StorageModule } from '../../common/modules/storage.module';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { InspectionRoundModule } from '../inspection_round/inspection_round.module';
import { SharedModule } from '../../shared/shared.module';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisDocument } from '../thesis/entities/thesis-document.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportFile, Submission, GroupMember, Thesis, ThesisDocument]),
    RabbitmqModule,
    DocConfigModule,
    StorageModule,
    InspectionRoundModule,
    SharedModule,
    NotificationsModule,
  ],
  controllers: [ReportFileController],
  providers: [
    ReportFileService,
    JobProducerService,
    ResultConsumerService,
    VerificationService,
  ],
  exports: [ReportFileService, VerificationService],
})
export class ReportFileModule { }
