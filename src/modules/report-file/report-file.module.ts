import { Module } from '@nestjs/common';
import { ReportFileService } from './report-file.service';
import { ReportFileController } from './report-file.controller';

@Module({
  controllers: [ReportFileController],
  providers: [ReportFileService],
})
export class ReportFileModule {}
