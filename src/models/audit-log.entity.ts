import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type AuditAction = 'check' | 'grant' | 'revoke' | 'modify';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({
    type: 'enum',
    enum: ['check', 'grant', 'revoke', 'modify']
  })
  action!: AuditAction;

  @Column()
  target!: string;

  @Column()
  result!: boolean;

  @Column('jsonb')
  metadata!: Record<string, any>;

  @CreateDateColumn()
  timestamp!: Date;
} 