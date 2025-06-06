import { Injectable } from '@nestjs/common';
import { EntityMetadata } from 'typeorm';
import { PermissionConfig } from '../interfaces/config.interface';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

type FieldMapping = { [key: string]: string | undefined };

@Injectable()
export class SchemaValidatorService {
  validateFieldMappings(config: PermissionConfig): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    // Validate permissions entity fields
    this.validateEntityFields(
      config.database.entities.permissions.fields,
      ['id', 'name'],
      'permissions',
      result,
    );

    // Validate router permissions entity fields
    this.validateEntityFields(
      config.database.entities.routerPermissions.fields,
      ['id', 'route', 'method', 'permissionId'],
      'routerPermissions',
      result,
    );

    // Validate user permissions entity fields
    this.validateEntityFields(
      config.database.entities.userPermissions.fields,
      ['id', 'userId', 'permissionId', 'grantedAt'],
      'userPermissions',
      result,
    );

    result.isValid = result.errors.length === 0;
    return result;
  }

  validateDatabaseSchema(entities: EntityMetadata[]): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    // Get entity names
    const entityNames = entities.map((e) => e.name.toLowerCase());

    // Check required entities exist
    const requiredEntities = ['permission', 'routerpermission', 'userpermission'];
    for (const entity of requiredEntities) {
      if (!entityNames.includes(entity.toLowerCase())) {
        result.errors.push(`Missing required entity: ${entity}`);
      }
    }

    // Validate each entity's columns
    entities.forEach((entity) => {
      const columnNames = entity.columns.map((c) => c.propertyName.toLowerCase());

      switch (entity.name.toLowerCase()) {
        case 'permission':
          this.validateColumns(columnNames, ['id', 'name'], entity.name, result);
          break;
        case 'routerpermission':
          this.validateColumns(
            columnNames,
            ['id', 'route', 'method', 'permissionId'],
            entity.name,
            result,
          );
          break;
        case 'userpermission':
          this.validateColumns(
            columnNames,
            ['id', 'userId', 'permissionId', 'grantedAt'],
            entity.name,
            result,
          );
          break;
      }
    });

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateEntityFields(
    fields: FieldMapping,
    required: string[],
    entityName: string,
    result: ValidationResult,
  ): void {
    // Check required fields are mapped
    for (const field of required) {
      if (!fields[field]) {
        result.errors.push(`Missing required field mapping for ${entityName}: ${field}`);
      }
    }

    // Check for duplicate field mappings
    const mappedFields = Object.values(fields).filter(
      (field): field is string => field !== undefined,
    );
    const duplicates = mappedFields.filter((field, index) => mappedFields.indexOf(field) !== index);

    if (duplicates.length > 0) {
      result.errors.push(
        `Duplicate field mappings found in ${entityName}: ${duplicates.join(', ')}`,
      );
    }
  }

  private validateColumns(
    columns: string[],
    required: string[],
    entityName: string,
    result: ValidationResult,
  ): void {
    for (const column of required) {
      if (!columns.includes(column.toLowerCase())) {
        result.errors.push(`Missing required column in ${entityName}: ${column}`);
      }
    }
  }
}
