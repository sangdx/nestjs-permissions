export interface RouterPermission {
  id: string | number;
  route: string;
  method: string;
  permissionId: string | number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any; // Support for custom fields
}

export interface RouterPermissionFieldConfig {
  id: string;
  route: string;
  method: string;
  permissionId: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
  [customField: string]: string | undefined;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | '*'; 