import { SecurityConfig } from './security.interface';

export interface EntityConfig {
  tableName: string;
  fields: {
    [key: string]: string | undefined;
  };
}

export interface DatabaseConfig {
  type: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
  entities: {
    permissions: EntityConfig;
    routerPermissions: EntityConfig;
    userPermissions: EntityConfig;
  };
}

export interface PermissionsConfig {
  defaultRole: string;
  adminRole: string;
  publicRoutes: string[];
  permissionStrategy: 'whitelist' | 'blacklist';
}

export interface PermissionConfig {
  database: DatabaseConfig;
  permissions: PermissionsConfig;
  security: SecurityConfig;
}
