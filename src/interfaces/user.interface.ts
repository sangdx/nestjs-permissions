export interface UserPermission {
  id: string | number;
  userId: string | number;
  permissionId: string | number;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  [key: string]: any; // Support for custom fields
}

export interface UserPermissionFieldConfig {
  id: string;
  userId: string;
  permissionId: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: string;
  [customField: string]: string | undefined;
} 