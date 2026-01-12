// src/modules/group-member/entities/group-member.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { GroupMemberRole } from '../enum/group-member-role.enum';
import { InvitationStatus } from '../enum/invitation-status.enum';
import { Student } from '../../users/entities/student.entity';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  member_id: string;

  @Column()
  student_uuid: string;

  @ManyToOne(() => Student, (student) => student.groupMembers)
  @JoinColumn({ name: 'student_uuid', referencedColumnName: 'student_uuid' })
  student: Student;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
  })
  role: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  invitation_status: InvitationStatus;

  @CreateDateColumn()
  invited_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column()
  group_id: string;

  @ManyToOne(() => ThesisGroup, (group) => group.members)
  @JoinColumn({ name: 'group_id' })
  group: ThesisGroup;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
