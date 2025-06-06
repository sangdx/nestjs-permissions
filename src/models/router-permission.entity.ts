import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('router_permissions')
export class RouterPermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  route: string;

  @Column()
  method: string;

  @Column({ name: 'permission_id' })
  permission_id: number;

  @Column({ name: 'is_active' })
  is_active: boolean;

  @Column({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'updated_at' })
  updated_at: Date;
}
