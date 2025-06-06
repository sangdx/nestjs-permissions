import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PERMISSIONS_KEY, PERMISSION_OPTIONS_KEY, PermissionOptions } from '../decorators/require-permission.decorator';
import { ConfigService } from '../services/config.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<Omit<PermissionOptions, 'permissions'>>(
      PERMISSION_OPTIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id; // Assuming user is attached to request by authentication

    if (!userId) {
      return options?.fallback === 'allow';
    }

    const config = this.configService.getConfig();
    
    // Check if user is admin
    const userPermissions = await this.permissionService.getUserPermissions(userId);
    const isAdmin = userPermissions.some(p => p.name === config.permissions.adminRole);
    if (isAdmin) {
      return true;
    }

    // Get route information
    const route = request.route.path;
    const method = request.method;

    // Check route permission
    const hasRoutePermission = await this.permissionService.checkRoutePermission(
      route,
      method,
      userId
    );

    if (!hasRoutePermission) {
      return false;
    }

    // Check specific permissions based on strategy
    if (options?.strategy === 'OR') {
      return requiredPermissions.some(permission =>
        userPermissions.some(p => p.name === permission)
      );
    }

    // Default to AND strategy
    return requiredPermissions.every(permission =>
      userPermissions.some(p => p.name === permission)
    );
  }
} 