import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, DeleteDateColumn } from 'typeorm';
import { Student } from '../../users/entities/student.entity';

@Entity('class_sections')
export class ClassSection {
  @PrimaryGeneratedColumn()
  section_id: number;

  @Column()
  section_name: string;

  @Column()
  academic_year: number;

  @Column()
  term: string;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  delete_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Student, (student) => student.classSection)
  students: Student[];
}