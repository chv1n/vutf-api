// src/modules/inspection_round/entities/inspection_round.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';

export enum InspectionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CourseType {
  PRE_PROJECT = 'PRE_PROJECT',
  PROJECT = 'PROJECT',
  ALL = 'ALL'
}

@Entity('inspection_rounds')
export class InspectionRound {
  @PrimaryGeneratedColumn({ name: 'inspection_id' })
  inspectionId: number;

  @Column({ name: 'academic_year', length: 4 })
  academicYear: string;

  @Column({ name: 'term', length: 1 })
  term: string;

  @Column({ name: 'round_number', type: 'int' })
  roundNumber: number;

  @Column({
    name: 'course_type',
    type: 'enum',
    enum: CourseType,
    default: CourseType.ALL
  })
  courseType: CourseType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: InspectionStatus,
    default: InspectionStatus.CLOSED,
  })
  status: InspectionStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_manual_closed', default: false })
  isManualClosed: boolean;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @OneToMany(() => Submission, (submission) => submission.inspectionRound)
  submissions: Submission[];
}