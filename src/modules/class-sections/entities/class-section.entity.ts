// src/modules/class-sections/entities/class-section.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, DeleteDateColumn, Unique } from 'typeorm';
import { Student } from '../../users/entities/student.entity';

@Entity('class_sections')
@Unique(['academic_year', 'term', 'section_name'])
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

  @OneToMany(() => Student, (student) => student.section)
  students: Student[];
}