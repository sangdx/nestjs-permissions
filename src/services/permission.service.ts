import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Permission, PermissionOptions } from '../interfaces/permission.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../models/permission.entity';
import { UserPermissionEntity } from '../models/user-permission.entity';
import { RouterPermissionEntity } from '../models/router-permission.entity';
import { DynamicQueryBuilder } from '../utils/query-builder.util';
import 'reflect-metadata';
import { PermissionFieldConfig } from '../interfaces/permission.interface';
import { RouterPermissionFieldConfig } from '../interfaces/router.interface';

interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
  hasPermission?: boolean;
}

@Injectable()
export class PermissionService {
  private permissionCache: Map<string, CacheEntry> = new Map();
  private readonly cache: Map<string, CacheEntry> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(UserPermissionEntity)
    private readonly userPermissionRepository: Repository<UserPermissionEntity>,
    @InjectRepository(RouterPermissionEntity)
    private readonly routerPermissionRepository: Repository<RouterPermissionEntity>,
  ) {}

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const cached = this.permissionCache.get(userId);
    const config = this.configService.getConfig();

    if (cached && Date.now() - cached.timestamp < config.security.cacheTimeout * 1000) {
      return cached.permissions;
    }

    const userPermissions = await this.userPermissionRepository.find({
      where: { userId },
      relations: ['permission'],
    });

    const permissions = userPermissions.map((up) => ({
      id: up.permission.id,
      name: up.permission.name,
      description: up.permission.description,
      level: up.permission.level,
      is_active: up.permission.is_active,
      created_at: up.permission.created_at || new Date(),
      updated_at: up.permission.updated_at || new Date(),
    }));

    this.permissionCache.set(userId, {
      permissions,
      timestamp: Date.now(),
    });

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
      {
        id: 'id',
        route: 'route',
        method: 'method',
        permission_id: 'permission_id',
        is_active: 'is_active',
        created_at: 'created_at',
        updated_at: 'updated_at',
      } as RouterPermissionFieldConfig,
      'rp',
    );

    // Add conditions
    routerPermissionQuery
      .where('rp.route = :route', { route })
      .andWhere('rp.method = :method', { method })
      .andWhere('rp.is_active = :isActive', { isActive: true });

    const routerPermissions = await routerPermissionQuery.getMany();

    // If no permissions required and strategy is blacklist, allow access
    if (routerPermissions.length === 0 && config.permissions.permissionStrategy === 'blacklist') {
      return true;
    }

    // Get user permissions
    const userPermissions = await this.getUserPermissions(userId);

    // Check if user has required permissions
    const hasPermissions = routerPermissions.every((rp) =>
      userPermissions.some((up) => up.id === rp.permission_id),
    );

    return hasPermissions;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    this.permissionCache.delete(userId);
  }

  async clearAllCache(): Promise<void> {
    this.permissionCache.clear();
  }

  async validateUserPermissions(
    userId: string,
    requiredPermissions: string[],
    options: PermissionOptions = {},
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);

    if (options.strategy === 'OR') {
      return requiredPermissions.some((permission) =>
        userPermissions.some((p) => p.name === permission),
      );
    }

    // Default to AND strategy
    return requiredPermissions.every((permission) =>
      userPermissions.some((p) => p.name === permission),
    );
  }

  async hasPermission(userId: string, route: string, method: string): Promise<boolean> {
    const config = this.configService.getConfig();

    // Check cache first
    const cacheKey = `permission:${userId}:${route}:${method}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < config.security.cacheTimeout * 1000) {
      return cached.hasPermission || false;
    }

    // Get user permissions
    const userPermissions = await this.getUserPermissions(userId);
    const permissionIds = userPermissions.map((up) => up.id);

    // Get router permissions for the route and method
    const routerPermissions = await this.getRouterPermissions(route, method);
    const requiredPermissionIds = routerPermissions.map((rp) => rp.permission_id);

    // Check if user has any of the required permissions
    const hasPermission = permissionIds.some((id) => requiredPermissionIds.includes(id));

    // Cache the result
    if (config.security.enableCaching) {
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        permissions: [],
        hasPermission,
      });
    }

    return hasPermission;
  }

  private async getRouterPermissions(
    route: string,
    method: string,
  ): Promise<RouterPermissionEntity[]> {
    const config = this.configService.getConfig();
    const queryBuilder = this.routerPermissionRepository.createQueryBuilder('rp');
    const fields = {
      id: 'id',
      route: 'route',
      method: 'method',
      permission_id: 'permission_id',
      is_active: 'is_active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    } as RouterPermissionFieldConfig;

    return queryBuilder
      .where('rp.route = :route AND rp.method = :method', { route, method })
      .getMany();
  }

  async getPermissions(): Promise<PermissionEntity[]> {
    const config = this.configService.getConfig();
    const queryBuilder = this.permissionRepository.createQueryBuilder('p');
    const fields = {
      id: 'id',
      name: 'name',
      description: 'description',
      level: 'level',
      is_active: 'is_active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    } as PermissionFieldConfig;

    return queryBuilder.getMany();
  }
}
