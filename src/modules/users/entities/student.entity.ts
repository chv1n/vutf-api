import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserAccount } from './user-account.entity';

@Entity({ name: 'student' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  student_uuid: string;

  @Column({ unique: true })
  student_code: string; 
  

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  phone: string;

  @Column('uuid')
  user_id: string;

  @CreateDateColumn()
  create_at: Date;

  @OneToOne(() => UserAccount, (user) => user.student, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;
}
