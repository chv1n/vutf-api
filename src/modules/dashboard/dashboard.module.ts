// src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ReportFile } from '../report-file/entities/report-file.entity';
import { UserAccount } from '../users/entities/user-account.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { ThesisDocument } from '../thesis/entities/thesis-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Thesis, ReportFile, UserAccount, Submission, ThesisGroup, ThesisDocument])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}