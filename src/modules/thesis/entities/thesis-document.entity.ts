// src/modules/thesis/entities/thesis-document.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn
} from 'typeorm';
import { Thesis } from './thesis.entity';
import { CourseType, ThesisStatus } from '../enums/course-type.enum';

// Enum เพื่อระบุประเภทของเอกสาร
export enum DocumentType {
  FULL_THESIS_PDF = 'PDF',       // เล่มสมบูรณ์ (PDF) สำหรับเผยแพร่
  FULL_THESIS_WORD = 'WORD',     // เล่มสมบูรณ์ (Word) สำหรับเก็บต้นฉบับ
  SOURCE_CODE = 'CODE',          // ซอร์สโค้ด (เผื่ออนาคต)
  POSTER = 'POSTER',             // โปสเตอร์ (เผื่ออนาคต)
  OTHER = 'OTHER'
}

@Entity('thesis_documents')
export class ThesisDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.FULL_THESIS_PDF
  })
  document_type: DocumentType;

  @Column({
    type: 'enum',
    enum: CourseType,
    default: CourseType.PRE_PROJECT
  })
  course_type: CourseType;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  file_name: string;

  @Column({ name: 'file_size', type: 'int', nullable: true, comment: 'Size in bytes' })
  file_size: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true })
  storagePath: string;

  @ManyToOne(() => Thesis, (thesis) => thesis.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thesis_id' })
  thesis: Thesis;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}