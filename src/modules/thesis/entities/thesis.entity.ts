import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne } from 'typeorm';
import { ThesisGroup } from '../../thesis-group/entities/thesis-group.entity';

@Entity('thesis')
export class Thesis {
  @PrimaryGeneratedColumn('uuid') // เปลี่ยนเป็น uuid
  thesis_id: string; // เปลี่ยน type เป็น string

  @Column({ unique: true })
  thesis_code: string;

  @Column()
  thesis_name_th: string;

  @Column()
  thesis_name_en: string;

  @Column()
  graduation_year: number;

  @Column({ nullable: true })
  file_url: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => ThesisGroup, (group) => group.thesis)
  group: ThesisGroup;
}