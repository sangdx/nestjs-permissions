export interface Permission {
  id: string | number;
  name: string;
  description?: string;
  level?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any; // Support for custom fields
}

export interface PermissionFieldConfig {
  id: string;
  name: string;
  description?: string;
  level?: string;
  isActive?: string;
  createdAt?: string;
  updatedAt?: string;
  [customField: string]: string | undefined;
} 