import { SetMetadata } from '@nestjs/common';

export interface PermissionOptions {
  permissions: string[];
  strategy?: 'AND' | 'OR';
  fallback?: 'deny' | 'allow';
  cache?: boolean;
}

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_OPTIONS_KEY = 'permission_options';

export const RequirePermission = (options: PermissionOptions) => {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    SetMetadata(PERMISSIONS_KEY, options.permissions)(target, key!, descriptor!);
    SetMetadata(PERMISSION_OPTIONS_KEY, {
      strategy: options.strategy || 'AND',
      fallback: options.fallback || 'deny',
      cache: options.cache ?? true
    })(target, key!, descriptor!);
  };
}; 