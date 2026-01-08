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
import { Instructor } from '../../users/entities/instructor.entity';
import { AdvisorRole } from '../enum/advisor-role.enum';

@Entity('advisor_assignment')
export class AdvisorAssignment {
  @PrimaryGeneratedColumn('uuid')
  advisor_id: string;

  @Column({
    type: 'enum',
    enum: AdvisorRole,
  })
  role: string;

  @CreateDateColumn()
  assigned_at: Date;

  @Column()
  instructor_uuid: string;

  @ManyToOne(() => Instructor, (instructor) => instructor.advisor)
  @JoinColumn({ name: 'instructor_uuid' })
  instructor: Instructor;

  @Column()
  group_id: string;

  @ManyToOne(() => ThesisGroup, (group) => group.advisor)
  @JoinColumn({ name: 'group_id' })
  group: ThesisGroup;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
