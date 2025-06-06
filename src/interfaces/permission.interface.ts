export interface Permission {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionOptions {
  strategy?: 'AND' | 'OR';
  fallback?: 'deny' | 'allow';
  cache?: boolean;
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
