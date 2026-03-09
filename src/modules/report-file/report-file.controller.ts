// src/modules/report-file/report-file.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
  Request,
} from '@nestjs/common';
import { ReportFileService } from './report-file.service';
import { UpdateReportFileDto } from './dto/update-report-file.dto';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';
import { VerificationService } from './services/verification.service';
import { VerifyBatchDto } from './dto/verify-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VerificationResultStatus } from './enum/report-status.enum';
@Controller('report-file')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportFileController {
  constructor(
    private readonly reportFileService: ReportFileService,
    private readonly verificationService: VerificationService,
  ) { }

  @Get()
  findAll(@Query() filterDto: GetReportsFilterDto) {
    // เปลี่ยนไปเรียก getAllReports ที่เราเขียน Logic Join & Filter ไว้
    return this.reportFileService.getAllReports(filterDto);
  }

  @Get('submission/:submissionId')
  async findBySubmissionId(@Param('submissionId', ParseIntPipe) submissionId: number) {
    return this.reportFileService.findBySubmissionId(submissionId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportFileService.findOne(id);
  }

  @Patch(':id/comment')
  @Roles('admin', 'instructor')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportFileDto: UpdateReportFileDto,
  ) {
    return this.reportFileService.update(id, updateReportFileDto);
  }

  @Put(':id/csv')
  @Roles('admin', 'instructor')
  async updateCsv(
    @Param('id', ParseIntPipe) id: number,
    @Body('csvContent') csvContent: string,
  ) {
    return this.reportFileService.updateReportCsv(id, csvContent);
  }

  /**
   * Send a submission for PDF verification
   * POST /report-file/verify/:submissionId
   */
  // @Post('verify/:submissionId')
  // @HttpCode(HttpStatus.ACCEPTED)
  // async verifySubmission(
  //   @Param('submissionId', ParseIntPipe) submissionId: number,
  // ) {
  //   return this.verificationService.sendToVerification(submissionId);
  // }

  @Post('verify-batch')
  @Roles('admin', 'instructor')
  @HttpCode(HttpStatus.ACCEPTED)
  async verifyBatch(
    @Body() dto: VerifyBatchDto,
    @Request() req, // รับ Request เพื่อดึง User
  ) {
    const reviewerId = req.user.userId;

    return this.verificationService.sendBatchToVerification(dto.submissionIds, reviewerId);
  }

  @Patch(':id/review')
  @Roles('admin', 'instructor')
  async reviewReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportFileDto,
    @Request() req,
  ) {
    const instructorId = req.user.userId; // ดึง ID จาก Token

    return this.reportFileService.submitReview(
      id,
      dto.reviewStatus,
      dto.comment || '',
      instructorId
    );
  }

  /**
   * สำหรับนักศึกษา: ดูผล Report เฉพาะที่อาจารย์ตรวจแล้ว
   */
  @Get('submission/:submissionId/student')
  async findForStudent(@Param('submissionId', ParseIntPipe) submissionId: number) {
    return this.reportFileService.findStudentReports(submissionId);
  }

  @Patch(':id/verification-status')
  @Roles('admin', 'instructor') // กำหนดสิทธิ์ตามที่ต้องการ
  async updateVerificationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: VerificationResultStatus,
  ) {
    return this.reportFileService.updateVerificationStatus(id, status);
  }

}
