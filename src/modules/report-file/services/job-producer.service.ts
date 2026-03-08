// src/modules/report-file/services/job-producer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type { JobMessage } from '../../../shared/rabbitmq/interfaces';
import type { DocumentConfigData } from '../../doc-config/interface/doc-config.interface';

@Injectable()
export class JobProducerService {
    private readonly logger = new Logger(JobProducerService.name);
    private readonly jobQueue: string;

    constructor(
        private readonly amqpConnection: AmqpConnection,
        private readonly configService: ConfigService,
    ) {
        this.jobQueue = this.configService.get<string>('rabbitmq.jobQueue') || 'pdf_verification_jobs';
    }

    async sendVerificationJob(
        submissionId: number,
        fileUrl: string,
        fileName: string,
        config: DocumentConfigData,
        attempt: number,
        startTime: Date
    ): Promise<string> {
        const jobId = uuidv4();

        const message: JobMessage = {
            job_id: jobId,
            submission_id: submissionId,
            file_url: fileUrl,
            file_name: fileName,
            config,
            attempt,
            created_at: new Date().toISOString(),
            start_time: startTime.toISOString(),
        };

        await this.amqpConnection.publish(
            'pdf_verification',
            this.jobQueue,
            message,
        );

        this.logger.log(`Job ${jobId} sent for submission ${submissionId} (Attempt #${attempt})`);

        return jobId;
    }
}
