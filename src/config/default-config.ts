import { PermissionConfig } from '../interfaces/config.interface';

export const defaultConfig: PermissionConfig = {
  database: {
    type: 'postgres',
    entities: {
      permissions: {
        tableName: 'permissions',
        fields: {
          id: 'id',
          name: 'name',
          description: 'description',
          level: 'level',
          isActive: 'is_active',
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      },
      routerPermissions: {
        tableName: 'router_permissions',
        fields: {
          id: 'id',
          route: 'route',
          method: 'method',
          permissionId: 'permission_id',
          isActive: 'is_active',
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      },
      userPermissions: {
        tableName: 'user_permissions',
        fields: {
          id: 'id',
          userId: 'user_id',
          permissionId: 'permission_id',
          grantedAt: 'granted_at',
          expiresAt: 'expires_at',
          isActive: 'is_active'
        }
      }
    }
  },
  permissions: {
    defaultRole: 'user',
    adminRole: 'admin',
    publicRoutes: ['/auth/login', '/auth/register'],
    permissionStrategy: 'whitelist'
  },
  security: {
    enableCaching: true,
    cacheTimeout: 3600, // 1 hour
    enableAuditLog: true
  }
}; 