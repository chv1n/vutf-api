// src/shared/rabbitmq/interfaces/job-message.interface.ts

import type { DocumentConfigData } from '../../../modules/doc-config/interface/doc-config.interface';

export interface JobMessage {
    job_id: string;
    submission_id: number;
    file_url: string;
    file_name: string;
    config: DocumentConfigData;
    attempt: number;
    created_at: string;
    start_time: string;
}
