import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouterPermissionEntity } from '../models/router-permission.entity';
import { PermissionEntity } from '../models/permission.entity';
import { ConfigService } from '../services/config.service';
import { UserPermissionEntity } from '../models/user-permission.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
    @InjectRepository(RouterPermissionEntity)
    private readonly routerPermissionRepository: Repository<RouterPermissionEntity>,
    @InjectRepository(UserPermissionEntity)
    private readonly userPermissionRepository: Repository<UserPermissionEntity>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Get route and method
    const route = request.route.path;
    const method = request.method.toLowerCase();

    // Check if it's a public route
    const config = this.configService.getConfig();
    if (config.permissions.publicRoutes.includes(route)) {
      return true;
    }

    // Get route permissions from database
    const routerPermissions = await this.routerPermissionRepository
      .createQueryBuilder('rp')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .select(['rp.id', 'rp.route', 'rp.method', 'rp.permission_id', 'p.name'])
      .where('rp.route = :route', { route })
      .andWhere('rp.method = :method', { method })
      .andWhere('rp.is_active = :isActive', { isActive: true })
      .getMany();

    // If no permissions are defined, check permission strategy
    if (routerPermissions.length === 0) {
      if (config.permissions.permissionStrategy === 'blacklist') {
        return true;
      }
      return false; // If whitelist strategy and no permissions defined, deny access
    }

    // Get user's permissions from database
    const userPermissions = await this.userPermissionRepository
      .createQueryBuilder('up')
      .innerJoin('permissions', 'p', 'p.id = up.permission_id')
      .select(['up.permission_id', 'p.name'])
      .where('up.user_id = :userId', { userId: user.id })
      .andWhere('up.is_active = :isActive', { isActive: true })
      .getMany();

    // Check if user has all required permissions
    const hasPermissions = routerPermissions.every((rp) =>
      userPermissions.some((up) => up.permission_id === rp.permission_id)
    );

    // Log the permission check if audit service is available
    if (this.permissionService['auditService']) {
      await this.permissionService['auditService'].logPermissionCheck(user.id, route, hasPermissions, {
        method,
        requiredPermissions: routerPermissions.map(rp => rp.permission_id),
        userPermissions: userPermissions.map(up => up.permission_id)
      });
    }

    return hasPermissions;
  }
}
