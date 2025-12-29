import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { Instructor } from 'src/modules/users/entities/instructor.entity';
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

  @ManyToOne(() => Instructor, (instructor) => instructor.advisor)
  @JoinColumn({ name: 'instructor_id' })
  instructor: Instructor;

  @ManyToOne(() => ThesisGroup, (group) => group.advisor)
  @JoinColumn({ name: 'group_id' })
  group: ThesisGroup;
}
