// src/modules/report-file/services/verification.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';
import { SubmissionStatus } from '../../submissions/enum/submission-status.enum';
import { JobProducerService } from './job-producer.service';
import { DocConfigService } from '../../doc-config/doc-config.service';
import type { IStorageService } from '../../../common/interfaces/storage.interface';
import { Inject } from '@nestjs/common';
import { STORAGE_SERVICE } from '../../../common/interfaces/storage.interface';

@Injectable()
export class VerificationService {
    private readonly logger = new Logger(VerificationService.name);

    constructor(
        @InjectRepository(Submission)
        private readonly submissionRepo: Repository<Submission>,
        private readonly jobProducerService: JobProducerService,
        private readonly docConfigService: DocConfigService,
        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,
    ) { }

    /**
     * Send a submission to the Python Worker for verification
     * Fetches config from Redis (fast path) and sends job to RabbitMQ
     */
    async sendToVerification(submissionId: number): Promise<{
        job_id: string;
        message: string;
    }> {
        // 1. Get submission with file info
        const submission = await this.submissionRepo.findOne({
            where: { submissionId },
        });

        if (!submission) {
            throw new NotFoundException(`Submission ${submissionId} not found`);
        }

        if (!submission.storagePath) {
            throw new NotFoundException(`Submission ${submissionId} has no file`);
        }

        // 2. Get fresh signed URL for the file
        const fileUrl = await this.storageService.getFileUrl(submission.storagePath);

        // 3. Get config from Redis (fast path) or DB
        const config = await this.docConfigService.get();

        // 4. Send job to RabbitMQ
        const jobId = await this.jobProducerService.sendVerificationJob(
            submissionId,
            fileUrl,
            submission.fileName,
            config,
        );

        // 5. Update status to IN_PROGRESS
        submission.status = SubmissionStatus.IN_PROGRESS;
        await this.submissionRepo.save(submission);

        this.logger.log(`Verification job ${jobId} sent for submission ${submissionId}`);

        return {
            job_id: jobId,
            message: `Submission ${submissionId} has been sent to verification queue.`,
        };
    }

    /**
     * Send multiple submissions for verification (batch)
     */
    async sendBatchToVerification(submissionIds: number[]) {
        const jobs = await Promise.all(
            submissionIds.map((id) =>
                this.sendToVerification(id).catch((error) => ({
                    success: false,
                    submission_id: id,
                    error: error.message,
                })),
            ),
        );
        return { jobs };
    }
}
