// src/modules/report-file/services/result-consumer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ReportFileService } from '../report-file.service';
import { Submission } from '../../submissions/entities/submission.entity';
import { SubmissionStatus } from '../../submissions/enum/submission-status.enum';
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
            if (message.status === 'completed') {
                await this.reportFileService.createFromResult(message);

                // Update submission status to COMPLETED
                await this.submissionRepo.update(
                    { submissionId: message.submission_id },
                    { status: SubmissionStatus.COMPLETED }
                );

                this.logger.log(`Result saved for submission ${message.submission_id}`);
            } else {
                this.logger.error(
                    `Job ${message.job_id} failed: ${message.error_message}`,
                );
                await this.reportFileService.markAsFailed(
                    message.submission_id,
                    message.error_message || 'Unknown error',
                );

                // Reset submission status to PENDING on failure (allow retry)
                await this.submissionRepo.update(
                    { submissionId: message.submission_id },
                    { status: SubmissionStatus.PENDING }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing result: ${error.message}`, error.stack);
        }
    }
}
