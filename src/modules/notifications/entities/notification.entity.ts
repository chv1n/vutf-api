// src/modules/notifications/entities/notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserAccount } from '../../users/entities/user-account.entity';

export enum NotificationType {
  SUBMISSION_STATUS = 'submission_status', // เมื่อผลตรวจเสร็จ หรืออาจารย์เปลี่ยนสถานะ
  GROUP_INVITE = 'group_invite',           // เมื่อมีคนเชิญเข้ากลุ่ม
  NEW_COMMENT = 'new_comment',             // เมื่ออาจารย์คอมเมนต์งาน
  SYSTEM_ANNOUNCE = 'system_announce',     // ประกาศจากระบบ
  GROUP_STATUS = 'group_status'            // แจ้งเตือนเมื่อสถานะกลุ่มเปลี่ยน
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ผู้รับแจ้งเตือน
  @ManyToOne(() => UserAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;

  @Column()
  user_id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  // เก็บ JSON เพื่อลิงก์ไปหน้าต่างๆ เช่น { submissionId: 1, groupId: 5 }
  @Column({ type: 'jsonb', nullable: true })
  data: any; 

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}