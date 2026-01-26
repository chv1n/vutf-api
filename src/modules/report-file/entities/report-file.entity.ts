import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('report_file')
export class ReportFile {
    @PrimaryGeneratedColumn()
    report_file_id: number;

    @Column()
    file_url: string;

    @Column()
    file_name: string;

    @Column()
    file_type: string;

    @Column()
    submission_id: number;

    @Column({ default: 'active' })
    status: string;

    @CreateDateColumn()
    reported_at: Date;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @Column({ nullable: true })
    comment_by: number;

    @ManyToOne(() => Submission, (submission) => submission.report_files)
    @JoinColumn({ name: 'submission_id' })
    submission: Submission;
}