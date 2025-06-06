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
    const { id, name, description, level, is_active, created_at, updated_at, ...customFields } =
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
    if (is_active) {
      queryBuilder.addSelect(`${alias}.${is_active}`, 'is_active');
    }
    if (created_at) {
      queryBuilder.addSelect(`${alias}.${created_at}`, 'created_at');
    }
    if (updated_at) {
      queryBuilder.addSelect(`${alias}.${updated_at}`, 'updated_at');
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
    const { id, user_id, permission_id, granted_at, expires_at, is_active, ...customFields } = config;

    // Map standard fields
    queryBuilder
      .select(`${alias}.${id}`, 'id')
      .addSelect(`${alias}.${user_id}`, 'user_id')
      .addSelect(`${alias}.${permission_id}`, 'permission_id')
      .addSelect(`${alias}.${granted_at}`, 'granted_at');

    // Map optional standard fields
    if (expires_at) {
      queryBuilder.addSelect(`${alias}.${expires_at}`, 'expires_at');
    }
    if (is_active) {
      queryBuilder.addSelect(`${alias}.${is_active}`, 'is_active');
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
    const { id, route, method, permission_id, is_active, created_at, updated_at, ...customFields } =
      config;

    // Map standard fields
    queryBuilder
      .select(`${alias}.${id}`, 'id')
      .addSelect(`${alias}.${route}`, 'route')
      .addSelect(`${alias}.${method}`, 'method')
      .addSelect(`${alias}.${permission_id}`, 'permission_id');

    // Map optional standard fields
    if (is_active) {
      queryBuilder.addSelect(`${alias}.${is_active}`, 'is_active');
    }
    if (created_at) {
      queryBuilder.addSelect(`${alias}.${created_at}`, 'created_at');
    }
    if (updated_at) {
      queryBuilder.addSelect(`${alias}.${updated_at}`, 'updated_at');
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
