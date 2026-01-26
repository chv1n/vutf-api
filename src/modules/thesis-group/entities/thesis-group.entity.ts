// src/modules/thesis-group/entities/thesis-group.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Thesis } from '../../thesis/entities/thesis.entity';
import { GroupMember } from '../../group-member/entities/group-member.entity';
import { UserAccount } from '../../users/entities/user-account.entity';
import { AdvisorAssignment } from '../../advisor-assignment/entities/advisor-assignment.entity';
import { Submission } from '../../submissions/entities/submission.entity';

export enum ThesisGroupStatus {
  INCOMPLETE = 'incomplete', // กลุ่มยังไม่สมบูรณ์ (สมาชิกยังไม่ครบ/ยังไม่ตอบรับ)
  PENDING = 'pending',     // รออนุมัติ
  APPROVED = 'approved',   // อนุมัติแล้ว
  REJECTED = 'rejected',   // ปฏิเสธ
}

@Entity('thesis_group')
export class ThesisGroup {
  @PrimaryGeneratedColumn('uuid')
  group_id: string;

  @ManyToOne(() => UserAccount, (user) => user.thesisGroups)
  @JoinColumn({ name: 'created_by' })
  created_by: UserAccount;

  @Column({
    type: 'enum',
    enum: ThesisGroupStatus,
    default: ThesisGroupStatus.INCOMPLETE,
  })
  status: ThesisGroupStatus;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => Thesis, (thesis) => thesis.group)
  @JoinColumn({ name: 'thesis_id' })
  thesis: Thesis;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => AdvisorAssignment, (advisor) => advisor.group)
  advisor: AdvisorAssignment[];

  @OneToMany(() => Submission, (submission) => submission.group)
  submissions: Submission[];
}
