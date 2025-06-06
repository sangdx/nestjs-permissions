import { PermissionFieldConfig } from './permission.interface';
import { RouterPermissionFieldConfig } from './router.interface';
import { UserPermissionFieldConfig } from './user.interface';

export interface DatabaseConfig {
  type: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
  entities: {
    permissions: {
      tableName: string;
      fields: PermissionFieldConfig;
    };
    routerPermissions: {
      tableName: string;
      fields: RouterPermissionFieldConfig;
    };
    userPermissions: {
      tableName: string;
      fields: UserPermissionFieldConfig;
    };
  };
}

export interface PermissionsConfig {
  defaultRole: string;
  adminRole: string;
  publicRoutes: string[];
  permissionStrategy: 'whitelist' | 'blacklist';
}

export interface SecurityConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enableAuditLog: boolean;
}

export interface PermissionConfig {
  database: DatabaseConfig;
  permissions: PermissionsConfig;
  security: SecurityConfig;
} 