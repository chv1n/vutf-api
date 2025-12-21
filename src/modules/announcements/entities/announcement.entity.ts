import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid', { name: 'announce_id' })
  announceId: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ name: 'img_base64', type: 'text', nullable: true })
  imgBase64: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}