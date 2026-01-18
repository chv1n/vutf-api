// src/modules/report-file/services/result-consumer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ReportFileService } from '../report-file.service';
import type { ResultMessage } from '../../../shared/rabbitmq/interfaces';

@Injectable()
export class ResultConsumerService {
    private readonly logger = new Logger(ResultConsumerService.name);

    constructor(private readonly reportFileService: ReportFileService) { }

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
                this.logger.log(`Result saved for submission ${message.submission_id}`);
            } else {
                this.logger.error(
                    `Job ${message.job_id} failed: ${message.error_message}`,
                );
                await this.reportFileService.markAsFailed(
                    message.submission_id,
                    message.error_message || 'Unknown error',
                );
            }
        } catch (error) {
            this.logger.error(`Error processing result: ${error.message}`, error.stack);
        }
    }
}
