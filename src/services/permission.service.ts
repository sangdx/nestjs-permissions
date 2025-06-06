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

interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
}

@Injectable()
export class PermissionService {
  private permissionCache: Map<string, CacheEntry> = new Map();

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
}
