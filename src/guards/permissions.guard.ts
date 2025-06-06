import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PERMISSION_OPTIONS_KEY } from '../constants';
import { PermissionOptions } from '../interfaces/permission.interface';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const options =
      this.reflector.getAllAndOverride<PermissionOptions>(PERMISSION_OPTIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return this.permissionService.validateUserPermissions(user.id, requiredPermissions, options);
  }
}
