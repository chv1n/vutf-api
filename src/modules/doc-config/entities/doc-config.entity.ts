// src/modules/doc-config/entities/doc-config.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { DocumentConfigData } from '../interface/doc-config.interface';

@Entity('document_configs')
export class DocConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'jsonb' })
    config: DocumentConfigData;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
