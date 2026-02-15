// src/modules/thesis/entities/thesis.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  DeleteDateColumn,
  JoinColumn
} from 'typeorm';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { ThesisDocument } from './thesis-document.entity';
import { CourseType, ThesisStatus } from '../enums/course-type.enum';

@Entity('thesis')
export class Thesis {
  @PrimaryGeneratedColumn('uuid')
  thesis_id: string;

  @Column({ unique: true })
  thesis_code: string;

  @Column()
  thesis_name_th: string;

  @Column()
  thesis_name_en: string;

  @Column()
  graduation_year: number;

  // @Column({ type: 'text', nullable: true })
  // file_url: string | null;

  @Column({
    type: 'enum',
    enum: CourseType,
    default: CourseType.PRE_PROJECT
  })
  course_type: CourseType;

  @Column({
    type: 'enum',
    enum: ThesisStatus,
    default: ThesisStatus.IN_PROGRESS
  })
  status: ThesisStatus;

  @Column({ nullable: true })
  start_academic_year: number;

  @Column({ nullable: true })
  start_term: number;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  delete_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => ThesisGroup, (group) => group.thesis)
  group: ThesisGroup;

  @OneToMany(() => Submission, (submission) => submission.thesis)
  submissions: Submission[];

  @OneToOne(() => Submission, { nullable: true })
  @JoinColumn({ name: 'approved_submission_id' })
  approved_submission: Submission | null;

  @OneToMany(() => ThesisDocument, (document) => document.thesis)
  documents: ThesisDocument[];
}