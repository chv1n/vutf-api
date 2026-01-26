// src/modules/report-file/report-file.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportFileService } from './report-file.service';
import { UpdateReportFileDto } from './dto/update-report-file.dto';
import { VerificationService } from './services/verification.service';
import { VerifyBatchDto } from './dto/verify-batch.dto';

@Controller('report-file')
export class ReportFileController {
  constructor(
    private readonly reportFileService: ReportFileService,
    private readonly verificationService: VerificationService,
  ) { }

  @Get()
  findAll() {
    return this.reportFileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportFileService.findOne(id);
  }

  @Patch(':id/comment')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportFileDto: UpdateReportFileDto,
  ) {
    return this.reportFileService.update(id, updateReportFileDto);
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
  @HttpCode(HttpStatus.ACCEPTED)
  async verifyBatch(@Body() dto: VerifyBatchDto) {
    return this.verificationService.sendBatchToVerification(dto.submissionIds);
  }

}
