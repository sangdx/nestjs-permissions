export interface RouterPermission {
  id: number;
  route: string;
  method: string;
  permission_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RouterPermissionFieldConfig {
  id: string;
  route: string;
  method: string;
  permission_id: string;
  is_active: string;
  created_at: string;
  updated_at: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | '*';
