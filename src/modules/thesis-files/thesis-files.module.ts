import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisFilesService } from './thesis-files.service';
import { ThesisFilesController } from './thesis-files.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

// Import Entities
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { ReportFile } from '../report-file/entities/report-file.entity';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisDocument } from '../thesis/entities/thesis-document.entity';

import { SharedModule } from '../../shared/shared.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionRound, 
      Submission, 
      ReportFile, 
      Thesis, 
      ThesisDocument,
    ]),
    SharedModule,
    AuditLogModule,
  ],
  controllers: [ThesisFilesController],
  providers: [ThesisFilesService],
})
export class ThesisFilesModule {}