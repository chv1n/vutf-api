import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Student } from './student.entity';
import { Instructor } from './instructor.entity';

@Entity({ name: 'user_account' })
export class UserAccount {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ length: 50 })
  role: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  create_at: Date;

  @OneToOne(() => Student, (student) => student.user)
  student: Student;

  @OneToOne(() => Instructor, (instructor) => instructor.user)
  instructor: Instructor;
}
