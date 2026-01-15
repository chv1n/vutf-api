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
import { UserAccount } from './user-account.entity';
import { GroupMember } from '../../group-member/entities/group-member.entity';
import { ClassSection } from '../../class-sections/entities/class-section.entity';

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

  @Column({ nullable: true })
  section_id: number;

  @ManyToOne(() => ClassSection, (section) => section.students)
  @JoinColumn({ name: 'section_id' })
  section: ClassSection;
}
