// src/modules/submissions/entities/submission.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
    OneToMany
} from 'typeorm';
import { Thesis } from '../../thesis/entities/thesis.entity';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { UserAccount } from '../../users/entities/user-account.entity';
import { InspectionRound } from '../../inspection_round/entities/inspection_round.entity';
import { SubmissionStatus } from '../enum/submission-status.enum';
import { Student } from '../../users/entities/student.entity';
import { ReportFile } from '../../report-file/entities/report-file.entity';



@Entity('submissions')
export class Submission {
    @PrimaryGeneratedColumn({ name: 'submission_id' })
    submissionId: number;

    @Column({ name: 'file_url', type: 'varchar', nullable: true })
    fileUrl: string;

    @Column({ name: 'file_name', type: 'varchar', nullable: true })
    fileName: string;

    @Column({ name: 'file_size', type: 'int', nullable: true })
    fileSize: number;

    @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
    mimeType: string;

    @Column({ name: 'storage_path', type: 'varchar', nullable: true })
    storagePath: string;

    // Relation to Thesis
    @ManyToOne(() => Thesis, (thesis) => thesis.submissions)
    @JoinColumn({ name: 'thesis_id' })
    thesis: Thesis;

    // Relation to ThesisGroup
    @ManyToOne(() => ThesisGroup, (group) => group.submissions)
    @JoinColumn({ name: 'group_id' })
    group: ThesisGroup;

    // Relation to UserAccount (submitter)
    @ManyToOne(() => UserAccount, (user) => user.submittedSubmissions)
    @JoinColumn({ name: 'submitter_id' })
    submitter: UserAccount;

    @CreateDateColumn({ name: 'submitted_at' })
    submittedAt: Date;

    // Relation to UserAccount (reviewer)
    @ManyToOne(() => UserAccount, (user) => user.reviewedSubmissions, { nullable: true })
    @JoinColumn({ name: 'reviewer_id' })
    reviewer: UserAccount;

    @Column({
        type: 'enum',
        enum: SubmissionStatus,
        default: SubmissionStatus.PENDING,
    })
    status: SubmissionStatus;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
    verifiedAt: Date | null;

    // Relation to InspectionRound
    @ManyToOne(() => InspectionRound, (inspection) => inspection.submissions)
    @JoinColumn({ name: 'inspection_id' })
    inspectionRound: InspectionRound;

    @OneToOne(() => Student, (student) => student.user)
    student: Student;

    @OneToMany(() => ReportFile, (reportFile) => reportFile.submission)
    report_files: ReportFile[];
}

