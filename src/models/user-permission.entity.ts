import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserPermission } from '../interfaces/user.interface';

@Entity('user_permissions')
export class UserPermissionEntity implements UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  permissionId!: string;

  @CreateDateColumn()
  grantedAt!: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  isActive!: boolean;

  // Dynamic columns will be added at runtime based on configuration
  [key: string]: any;
}
