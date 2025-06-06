import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserPermission } from '../interfaces/user.interface';

@Entity('user_permissions')
export class UserPermissionEntity implements UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'permission_id' })
  permissionId: number;

  @Column({ name: 'granted_at' })
  grantedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'is_active' })
  isActive: boolean;

  // Dynamic columns will be added at runtime based on configuration
  [key: string]: any;
}
