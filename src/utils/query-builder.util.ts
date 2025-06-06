import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PermissionFieldConfig } from '../interfaces/permission.interface';
import { UserPermissionFieldConfig } from '../interfaces/user.interface';
import { RouterPermissionFieldConfig } from '../interfaces/router.interface';

export class DynamicQueryBuilder {
  static buildPermissionQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    config: PermissionFieldConfig,
    alias = 'permission',
  ): SelectQueryBuilder<T> {
    const { id, name, description, level, isActive, createdAt, updatedAt, ...customFields } =
      config;

    // Map standard fields
    queryBuilder.select(`${alias}.${id}`, 'id').addSelect(`${alias}.${name}`, 'name');

    // Map optional standard fields
    if (description) {
      queryBuilder.addSelect(`${alias}.${description}`, 'description');
    }
    if (level) {
      queryBuilder.addSelect(`${alias}.${level}`, 'level');
    }
    if (isActive) {
      queryBuilder.addSelect(`${alias}.${isActive}`, 'isActive');
    }
    if (createdAt) {
      queryBuilder.addSelect(`${alias}.${createdAt}`, 'createdAt');
    }
    if (updatedAt) {
      queryBuilder.addSelect(`${alias}.${updatedAt}`, 'updatedAt');
    }

    // Map custom fields
    Object.entries(customFields).forEach(([key, value]) => {
      if (value) {
        queryBuilder.addSelect(`${alias}.${value}`, key);
      }
    });

    return queryBuilder;
  }

  static buildUserPermissionQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    config: UserPermissionFieldConfig,
    alias = 'userPermission',
  ): SelectQueryBuilder<T> {
    const { id, userId, permissionId, grantedAt, expiresAt, isActive, ...customFields } = config;

    // Map standard fields
    queryBuilder
      .select(`${alias}.${id}`, 'id')
      .addSelect(`${alias}.${userId}`, 'userId')
      .addSelect(`${alias}.${permissionId}`, 'permissionId')
      .addSelect(`${alias}.${grantedAt}`, 'grantedAt');

    // Map optional standard fields
    if (expiresAt) {
      queryBuilder.addSelect(`${alias}.${expiresAt}`, 'expiresAt');
    }
    if (isActive) {
      queryBuilder.addSelect(`${alias}.${isActive}`, 'isActive');
    }

    // Map custom fields
    Object.entries(customFields).forEach(([key, value]) => {
      if (value) {
        queryBuilder.addSelect(`${alias}.${value}`, key);
      }
    });

    return queryBuilder;
  }

  static buildRouterPermissionQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    config: RouterPermissionFieldConfig,
    alias = 'routerPermission',
  ): SelectQueryBuilder<T> {
    const { id, route, method, permissionId, isActive, createdAt, updatedAt, ...customFields } =
      config;

    // Map standard fields
    queryBuilder
      .select(`${alias}.${id}`, 'id')
      .addSelect(`${alias}.${route}`, 'route')
      .addSelect(`${alias}.${method}`, 'method')
      .addSelect(`${alias}.${permissionId}`, 'permissionId');

    // Map optional standard fields
    if (isActive) {
      queryBuilder.addSelect(`${alias}.${isActive}`, 'isActive');
    }
    if (createdAt) {
      queryBuilder.addSelect(`${alias}.${createdAt}`, 'createdAt');
    }
    if (updatedAt) {
      queryBuilder.addSelect(`${alias}.${updatedAt}`, 'updatedAt');
    }

    // Map custom fields
    Object.entries(customFields).forEach(([key, value]) => {
      if (value) {
        queryBuilder.addSelect(`${alias}.${value}`, key);
      }
    });

    return queryBuilder;
  }
}
