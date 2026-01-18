// src/modules/report-file/report-file.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportFile } from './entities/report-file.entity';
import { UpdateReportFileDto } from './dto/update-report-file.dto';
import type { ResultMessage } from '../../shared/rabbitmq/interfaces';

@Injectable()
export class ReportFileService {
  constructor(
    @InjectRepository(ReportFile)
    private readonly reportFileRepository: Repository<ReportFile>,
  ) { }

  async findAll(): Promise<ReportFile[]> {
    return this.reportFileRepository.find({
      order: { reported_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ReportFile> {
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: id },
    });

    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${id} not found`);
    }

    return reportFile;
  }

  async findBySubmissionId(submissionId: number): Promise<ReportFile[]> {
    return this.reportFileRepository.find({
      where: { submission_id: submissionId },
      order: { reported_at: 'DESC' },
    });
  }

  async update(
    id: number,
    updateReportFileDto: UpdateReportFileDto,
  ): Promise<ReportFile> {
    const reportFile = await this.findOne(id);
    Object.assign(reportFile, updateReportFileDto);
    return this.reportFileRepository.save(reportFile);
  }

  // Called by ResultConsumerService when Python Worker sends a completed result
  async createFromResult(result: ResultMessage): Promise<ReportFile> {
    const reportFile = this.reportFileRepository.create({
      submission_id: result.submission_id,
      file_url: result.result_file_url || '',
      file_name: result.result_file_name || '',
      file_type: 'pdf',
      status: 'active',
    });

    return this.reportFileRepository.save(reportFile);
  }

  // Called by ResultConsumerService when Python Worker sends a failed result
  async markAsFailed(
    submissionId: number,
    errorMessage: string,
  ): Promise<ReportFile> {
    const reportFile = this.reportFileRepository.create({
      submission_id: submissionId,
      file_url: '',
      file_name: '',
      file_type: 'error',
      status: 'failed',
      comment: errorMessage,
    });

    return this.reportFileRepository.save(reportFile);
  }
}
