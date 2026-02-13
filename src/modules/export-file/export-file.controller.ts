// src/modules/export-file/export-file.controller.ts
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ExportFileService } from './export-file.service';
import { ExportPdfService } from './export-pdf.service';
import { TrackThesisService } from '../track-thesis/track-thesis.service';
import { ReportFileService } from '../report-file/report-file.service'; 
import { GetUnsubmittedFilterDto } from '../track-thesis/dto/get-unsubmitted-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('export-file')
@UseGuards(JwtAuthGuard)
export class ExportFileController {
  constructor(
    private readonly exportService: ExportFileService,
    private readonly pdfService: ExportPdfService,        
    private readonly trackService: TrackThesisService,     
    private readonly reportService: ReportFileService     
  ) {}

  @Get('master-report')
  @Roles('admin', 'instructor')
  async exportMaster(
    @Query() filter: GetUnsubmittedFilterDto, 
    @Query('type') type: string,
    @Res() res
  ) {
    // กรณีเลือก PDF
    if (type === 'pdf') {
      // ดึงข้อมูลดิบ (Raw Data) จาก Service ต่างๆ
      const [unsubmitted, submitted, reports] = await Promise.all([
        this.trackService.getUnsubmittedGroups({ ...filter, isExport: true }),
        this.trackService.getSubmittedGroups({ ...filter, isExport: true }),
        this.reportService.getAllReports({ ...filter, limit: 1000 } as any),
      ]);

      // ดึง Context (ปี/เทอม) จาก meta data
      const meta = unsubmitted.meta as any;
      const ctx = meta?.filterContext || { academicYear: '-', term: '-', roundNumber: '-' };

      // ส่งข้อมูลไปสร้าง PDF
      return this.pdfService.generateMasterPdf(unsubmitted, submitted, reports, ctx, res);
    } 
    
    // กรณีเลือก Excel (Default)
    else {
      return this.exportService.exportMasterReport(filter, res);
    }
  }
}