import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { GroupMemberRole } from '../enum/group-member-role.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  member_id: string;

  @Column()
  student_id: string;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
  })
  role: string;

  @Column({ default: 'pending' })
  invitation_status: string;

  @CreateDateColumn()
  invited_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @ManyToOne(() => ThesisGroup, (group) => group.members)
  @JoinColumn({ name: 'group_id' })
  group: ThesisGroup;
}
