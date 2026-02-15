import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserAccount } from '../../users/entities/user-account.entity';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn({ name: 'log_id' })
    logId: number;

    @ManyToOne(() => UserAccount)
    @JoinColumn({ name: 'user_uuid' })
    user: UserAccount;

    @Column()
    action: string; // เช่น 'UPLOAD', 'DOWNLOAD', 'VIEW_PDF'

    @Column({ type: 'text', nullable: true })
    description: string; // เช่น 'ดาวน์โหลดไฟล์เล่มจบปี 2568'

    @Column({ name: 'target_type', nullable: true })
    targetType: string; // เช่น 'SUBMISSION', 'THESIS_DOC'

    @Column({ name: 'target_id', nullable: true })
    targetId: string; // ID ของไฟล์หรือรายการนั้นๆ

    @Column({ name: 'ip_address', nullable: true })
    ipAddress: string;

    @CreateDateColumn({ name: 'time_stamp' })
    timeStamp: Date;
}