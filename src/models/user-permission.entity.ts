import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { UserPermission } from '../interfaces/user.interface';

@Entity('user_permissions')
export class UserPermissionEntity implements UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ name: 'permission_id' })
  permission_id: number;

  @Column({ name: 'granted_at' })
  granted_at: Date;

  @Column({ name: 'expires_at', nullable: true })
  expires_at?: Date;

  @Column({ name: 'is_active' })
  is_active: boolean;

  // Dynamic columns will be added at runtime based on configuration
  [key: string]: any;
}
