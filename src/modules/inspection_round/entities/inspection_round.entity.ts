import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum InspectionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('inspection_rounds')
export class InspectionRound {
  @PrimaryGeneratedColumn({ name: 'inspection_id' })
  inspectionId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: InspectionStatus,
    default: InspectionStatus.OPEN,
  })
  status: InspectionStatus;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}