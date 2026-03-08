// src/modules/report-file/entites/report-file.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';
import { UserAccount } from '../../users/entities/user-account.entity';
import { VerificationResultStatus, InstructorReviewStatus } from '../enum/report-status.enum';

@Entity('report_file')
export class ReportFile {
    @PrimaryGeneratedColumn()
    report_file_id: number;

    @Column({ type: 'int', default: 1 })
    attempt_number: number;

    @Column()
    file_url: string;

    @Column({ type: 'text', nullable: true }) 
    csv_url: string | null;

    @Column()
    file_name: string;

    @Column()
    file_type: string;

    @Column({ name: 'file_size', type: 'int', nullable: true })
    file_size: number;

    @Column()
    submission_id: number;

    @Column({
        type: 'enum',
        enum: VerificationResultStatus,
        nullable: true
    })
    verification_status: VerificationResultStatus;

    @Column({
        type: 'enum',
        enum: InstructorReviewStatus,
        default: InstructorReviewStatus.PENDING
    })
    review_status: InstructorReviewStatus;

    @Column({ type: 'timestamp', nullable: true })
    started_at: Date | null;

    @CreateDateColumn()
    reported_at: Date;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @Column({ nullable: true })
    comment_by: string;

    @ManyToOne(() => Submission, (submission) => submission.report_files)
    @JoinColumn({ name: 'submission_id' })
    submission: Submission;

    @ManyToOne(() => UserAccount)
    @JoinColumn({ name: 'comment_by' })
    commenter: UserAccount;
}