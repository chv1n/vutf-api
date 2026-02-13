// src/modules/export-file/export-file.module.ts
import { Module } from '@nestjs/common';
import { ExportFileService } from './export-file.service';
import { ExportPdfService } from './export-pdf.service';
import { ExportFileController } from './export-file.controller';
import { TrackThesisModule } from '../track-thesis/track-thesis.module';
import { ReportFileModule } from '../report-file/report-file.module';

@Module({
  imports: [
    TrackThesisModule, // สำหรับข้อมูลกลุ่มค้างส่ง/ส่งแล้ว
    ReportFileModule,  // สำหรับข้อมูลผลการตรวจ
  ],
  controllers: [ExportFileController],
  providers: [ExportFileService, ExportPdfService],
})
export class ExportFileModule {}