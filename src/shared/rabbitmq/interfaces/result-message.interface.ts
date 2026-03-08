// src/shared/rabbitmq/interfaces/result-message.interface.ts

export type ResultStatus = 'completed' | 'failed';

export interface ResultMessage {
    job_id: string;
    submission_id: number;
    status: ResultStatus;
    result_file_url: string | null;
    result_csv_url?: string | null;
    result_file_name: string | null;
    result_file_size?: number;
    error_message: string | null;
    completed_at: string;
    start_time: string;
}
