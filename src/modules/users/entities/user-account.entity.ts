import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Student } from './student.entity';
import { Instructor } from './instructor.entity';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity({ name: 'user_account' })
export class UserAccount {
  @PrimaryGeneratedColumn('uuid')
  user_uuid: string;

  @Column({ length: 50 })
  role: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Student, (student) => student.user)
  student: Student;

  @OneToOne(() => Instructor, (instructor) => instructor.user)
  instructor: Instructor;

  @OneToMany(() => ThesisGroup, (thesisGroup) => thesisGroup.created_by)
  thesisGroups: ThesisGroup[];

  @OneToMany(() => Submission, (submission) => submission.submitter)
  submittedSubmissions: Submission[];

  @OneToMany(() => Submission, (submission) => submission.reviewer)
  reviewedSubmissions: Submission[];

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'user_permissions',
    joinColumn: { name: 'user_id', referencedColumnName: 'user_uuid' },
    inverseJoinColumn: { name: 'permissions_id', referencedColumnName: 'permissions_id' }
  })
  permissions: Permission[];
}
