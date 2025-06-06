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
import { PermissionConfig } from '../interfaces/config.interface';
import { RouterPermissionFieldConfig } from '../interfaces/router.interface';
import { PermissionFieldConfig } from '../interfaces/permission.interface';
import { UserPermissionFieldConfig } from '../interfaces/user.interface';
import { buildQuery } from '../utils/query-builder.util';

interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
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
      isActive: up.permission.isActive || false,
      createdAt: up.permission.createdAt || new Date(),
      updatedAt: up.permission.updatedAt || new Date(),
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
      config.database.entities.routerPermissions.fields,
      'rp',
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
    const hasPermissions = routerPermissions.every((rp) =>
      userPermissions.some((up) => up.id === rp.permissionId),
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
      return cached.hasPermission;
    }

    // Get user permissions
    const userPermissions = await this.getUserPermissions(userId);
    const permissionIds = userPermissions.map((up) => up.permissionId);

    // Get router permissions for the route and method
    const routerPermissions = await this.getRouterPermissions(route, method);
    const requiredPermissionIds = routerPermissions.map((rp) => rp.permissionId);

    // Check if user has any of the required permissions
    const hasPermission = permissionIds.some((id) => requiredPermissionIds.includes(id));

    // Cache the result
    if (config.security.enableCaching) {
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        hasPermission,
      });
    }

    return hasPermission;
  }

  private async getRouterPermissions(route: string, method: string): Promise<RouterPermissionEntity[]> {
    const config = this.configService.getConfig();
    const queryBuilder = this.routerPermissionRepository.createQueryBuilder('rp');
    const fields = config.database.entities.routerPermissions.fields as RouterPermissionFieldConfig;
    return new DynamicQueryBuilder(queryBuilder, fields).where({ route, method }).getMany();
  }

  async getPermissions(): Promise<PermissionEntity[]> {
    const config = this.configService.getConfig();
    const queryBuilder = this.permissionRepository.createQueryBuilder('p');
    const fields = config.database.entities.permissions.fields as PermissionFieldConfig;
    return new DynamicQueryBuilder(queryBuilder, fields).getMany();
  }
}
