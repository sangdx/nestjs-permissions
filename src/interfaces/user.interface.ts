export interface UserPermission {
  id: number;
  user_id: string;
  permission_id: number;
  granted_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface UserPermissionFieldConfig {
  id: string;
  user_id: string;
  permission_id: string;
  granted_at: string;
  expires_at: string;
  is_active: string;
}
