import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserAccount } from './user-account.entity';
import { GroupMember } from 'src/modules/group-member/entities/group-member.entity';

@Entity({ name: 'student' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  student_uuid: string;

  @Column({ unique: true })
  student_code: string;

  @Column()
  prefix_name: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  phone: string;

  @Column('uuid')
  user_uuid: string;

  @CreateDateColumn()
  create_at: Date;

  @OneToOne(() => UserAccount, (user) => user.student, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_uuid' })
  user: UserAccount;

  @OneToMany(() => GroupMember, (member) => member.student)
  groupMembers: GroupMember[];
}
