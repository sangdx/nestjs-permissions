import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RouterPermission } from '../interfaces/router.interface';

@Entity('router_permissions')
export class RouterPermissionEntity implements RouterPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  route!: string;

  @Column()
  method!: string;

  @Column()
  permissionId!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Dynamic columns will be added at runtime based on configuration
  [key: string]: any;
} 