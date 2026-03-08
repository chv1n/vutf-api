// src/modules/report-file/services/result-consumer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ReportFileService } from '../report-file.service';
import { Submission } from '../../submissions/entities/submission.entity';
import { SubmissionStatus } from '../../submissions/enum/submission-status.enum';
import { VerificationResultStatus } from '../enum/report-status.enum';
import type { ResultMessage } from '../../../shared/rabbitmq/interfaces';

@Injectable()
export class ResultConsumerService {
    private readonly logger = new Logger(ResultConsumerService.name);

    constructor(
        private readonly reportFileService: ReportFileService,
        @InjectRepository(Submission)
        private readonly submissionRepo: Repository<Submission>,
    ) { }

    @RabbitSubscribe({
        exchange: 'pdf_verification',
        routingKey: 'pdf_verification_results',
        queue: 'pdf_verification_results',
    })
    async handleResult(message: ResultMessage): Promise<void> {
        this.logger.log(`Received result for job ${message.job_id}`);

        try {
            // ------------------------------------------------------------------
            // CASE 1: Worker ทำงานจบสมบูรณ์ (Process Completed)
            // ------------------------------------------------------------------
            if (message.status === 'completed' && message.result_file_url) {
                
                // 1. วิเคราะห์ผลตรวจ (Grading) เพื่อบันทึกลง Report
                // มี CSV = FAIL, ไม่มี CSV = PASS
                const verificationResult = message.result_csv_url 
                    ? VerificationResultStatus.FAIL 
                    : VerificationResultStatus.PASS;

                // 2. สร้าง Report File (บันทึกผล Pass/Fail ลงในตาราง report_files)
                await this.reportFileService.createFromResult(message, verificationResult);

                // 3. อัปเดต Submission Status (Process Status)
                // ตรวจเสร็จแล้ว = COMPLETED เสมอ (ตามที่คุณต้องการ)
                await this.submissionRepo.update(
                    { submissionId: message.submission_id },
                    { status: SubmissionStatus.COMPLETED }
                );

                this.logger.log(`Job completed. Submission ${message.submission_id} marked as COMPLETED. Result: ${verificationResult}`);

            } 
            // ------------------------------------------------------------------
            // CASE 2: Worker ทำงานล้มเหลว/Crash (Process Failed)
            // ------------------------------------------------------------------
            else {
                const errorMessage = message.error_message || 'Unknown error';

                this.logger.error(`Job ${message.job_id} failed: ${errorMessage}`);

                // บันทึก Report เป็น ERROR
                await this.reportFileService.markAsFailed(
                    message.submission_id,
                    errorMessage,
                    VerificationResultStatus.ERROR,
                    message.start_time
                );

                // อัปเดต Submission Status เป็น FAILED
                await this.submissionRepo.update(
                    { submissionId: message.submission_id },
                    { status: SubmissionStatus.FAILED }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing result: ${error.message}`, error.stack);
        }
    }
}