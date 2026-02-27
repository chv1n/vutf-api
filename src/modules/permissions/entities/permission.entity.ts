import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  permissions_id: number;

  @Column({ type: 'varchar', length: 100 })
  action: string; // เช่น 'manage', 'approve', 'view'

  @Column({ type: 'varchar', length: 100 })
  resource: string; // เช่น 'users', 'thesis', 'format'
}