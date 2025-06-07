import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Permission } from '../interfaces/permission.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../models/permission.entity';
import { UserPermissionEntity } from '../models/user-permission.entity';
import { RouterPermissionEntity } from '../models/router-permission.entity';
import { DynamicQueryBuilder } from '../utils/query-builder.util';
import 'reflect-metadata';
import { RouterPermissionFieldConfig } from '../interfaces/router.interface';
import { AuditService } from './audit.service';

interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
  hasPermission?: boolean;
}

interface PermissionOptions {
  strategy?: 'AND' | 'OR';
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
    private readonly auditService: AuditService,
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

    if (config.permissions.publicRoutes.includes(route)) {
      return true;
    }

    const routerPermissions = await this.routerPermissionRepository
      .createQueryBuilder('rp')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .select(['rp.id', 'rp.route', 'rp.method', 'rp.permission_id', 'p.name'])
      .where('rp.route = :route', { route })
      .andWhere('rp.method = :method', { method })
      .andWhere('rp.is_active = :isActive', { isActive: true })
      .getMany();

    if (routerPermissions.length === 0 && config.permissions.permissionStrategy === 'blacklist') {
      return true;
    }

    const userPermissions = await this.userPermissionRepository
      .createQueryBuilder('up')
      .innerJoin('permissions', 'p', 'p.id = up.permission_id')
      .select(['up.id', 'up.user_id', 'up.permission_id', 'p.name'])
      .where('up.user_id = :userId', { userId })
      .andWhere('up.is_active = :isActive', { isActive: true })
      .getMany();

    const hasPermissions = routerPermissions.every((rp) =>
      userPermissions.some((up) => up.permission_id === rp.permission_id)
    );

    if (this.auditService) {
      await this.auditService.logPermissionCheck(userId, route, hasPermissions, {
        method,
        requiredPermissions: routerPermissions.map(rp => rp.permission_id),
        userPermissions: userPermissions.map(up => up.permission_id)
      });
    }

    return hasPermissions;
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

  async getPermissions(): Promise<PermissionEntity[]> {
    const queryBuilder = this.permissionRepository.createQueryBuilder('p');
    return queryBuilder.getMany();
  }
}
