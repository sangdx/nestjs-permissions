import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Permission } from '../interfaces/permission.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../models/permission.entity';
import { UserPermissionEntity } from '../models/user-permission.entity';
import { RouterPermissionEntity } from '../models/router-permission.entity';
import { DynamicQueryBuilder } from '../utils/query-builder.util';

@Injectable()
export class PermissionService {
  private permissionCache: Map<string, { permissions: Permission[]; timestamp: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(UserPermissionEntity)
    private readonly userPermissionRepository: Repository<UserPermissionEntity>,
    @InjectRepository(RouterPermissionEntity)
    private readonly routerPermissionRepository: Repository<RouterPermissionEntity>
  ) {}

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const config = this.configService.getConfig();

    // Check cache if enabled
    if (config.security.enableCaching) {
      const cached = this.permissionCache.get(userId);
      if (cached && Date.now() - cached.timestamp < config.security.cacheTimeout * 1000) {
        return cached.permissions;
      }
    }

    // Build dynamic query for user permissions
    const userPermissionQuery = this.userPermissionRepository.createQueryBuilder('up');
    DynamicQueryBuilder.buildUserPermissionQuery(
      userPermissionQuery,
      config.database.entities.userPermissions.fields,
      'up'
    );

    // Join with permissions table
    userPermissionQuery
      .innerJoinAndSelect('up.permission', 'p')
      .where('up.userId = :userId', { userId })
      .andWhere('up.isActive = :isActive', { isActive: true });

    // Apply dynamic field mapping for permissions
    DynamicQueryBuilder.buildPermissionQuery(
      userPermissionQuery,
      config.database.entities.permissions.fields,
      'p'
    );

    const userPermissions = await userPermissionQuery.getMany();
    const permissions = userPermissions.map(up => up.permission);

    // Update cache
    if (config.security.enableCaching) {
      this.permissionCache.set(userId, {
        permissions,
        timestamp: Date.now()
      });
    }

    return permissions;
  }

  async checkRoutePermission(route: string, method: string, userId: string): Promise<boolean> {
    const config = this.configService.getConfig();

    // Check if route is public
    if (config.permissions.publicRoutes.includes(route)) {
      return true;
    }

    // Build dynamic query for router permissions
    const routerPermissionQuery = this.routerPermissionRepository.createQueryBuilder('rp');
    DynamicQueryBuilder.buildRouterPermissionQuery(
      routerPermissionQuery,
      config.database.entities.routerPermissions.fields,
      'rp'
    );

    // Add conditions
    routerPermissionQuery
      .where('rp.route = :route', { route })
      .andWhere('rp.method = :method', { method })
      .andWhere('rp.isActive = :isActive', { isActive: true });

    const routerPermissions = await routerPermissionQuery.getMany();

    // If no permissions required and strategy is blacklist, allow access
    if (routerPermissions.length === 0 && config.permissions.permissionStrategy === 'blacklist') {
      return true;
    }

    // Get user permissions
    const userPermissions = await this.getUserPermissions(userId);

    // Check if user has required permissions
    const hasPermissions = routerPermissions.every(rp =>
      userPermissions.some(up => up.id === rp.permissionId)
    );

    return hasPermissions;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    this.permissionCache.delete(userId);
  }

  async clearAllCache(): Promise<void> {
    this.permissionCache.clear();
  }
} 