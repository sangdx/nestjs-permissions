import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, PERMISSION_OPTIONS_KEY } from '../constants';
import { PermissionOptions } from '../interfaces/permission.interface';

export function RequirePermission(
  permissions: string[],
  options: PermissionOptions = {},
): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    if (descriptor && key) {
      // Method decorator
      SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
      SetMetadata(PERMISSION_OPTIONS_KEY, options)(target, key, descriptor);
    } else {
      // Class decorator
      SetMetadata(PERMISSIONS_KEY, permissions)(target);
      SetMetadata(PERMISSION_OPTIONS_KEY, options)(target);
    }
    return descriptor || target;
  };
}
