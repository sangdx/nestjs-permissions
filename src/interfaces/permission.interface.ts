export interface Permission {
  id: number;
  name: string;
  description: string;
  level: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionOptions {
  strategy?: 'AND' | 'OR';
  fallback?: 'deny' | 'allow';
  cache?: boolean;
}

export interface PermissionFieldConfig {
  id: string;
  name: string;
  description: string;
  level: string;
  is_active: string;
  created_at: string;
  updated_at: string;
}
