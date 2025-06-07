import { Injectable } from '@nestjs/common';
import { EntityMetadata } from 'typeorm';
import { PermissionConfig } from '../interfaces/config.interface';
import * as path from 'path';
import * as fs from 'fs';

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

  async validateConfig(projectPath: string): Promise<boolean> {
    try {
      const tsConfigPath = path.join(projectPath, 'config', 'permissions.config.ts');
      // Check if config file exists
      if (!fs.existsSync(tsConfigPath)) {
        console.error('Configuration file not found. Expected:', tsConfigPath);
        return false;
      }
      // Read and validate the configuration file
      const config = await this.loadConfig(tsConfigPath);
      if (!config) {
        return false;
      }

      // Validate required top-level properties
      if (!this.validateTopLevelConfig(config)) {
        return false;
      }

      // Validate database configuration
      if (!this.validateDatabaseConfig(config.database)) {
        return false;
      }

      // Validate permissions configuration
      if (!this.validatePermissionsConfig(config.permissions)) {
        return false;
      }

      // Validate security configuration
      if (!this.validateSecurityConfig(config.security)) {
        return false;
      }

      // Validate field mappings
      const fieldValidation = this.validateFieldMappings(config);
      if (!fieldValidation.isValid) {
        console.error('Field mapping validation failed:', fieldValidation.errors);
        return false;
      }

      console.log('Configuration validation successful');
      return true;
    } catch (error) {
      console.error('Error validating configuration:', error);
      return false;
    }
  }

  private async loadConfig(configPath: string): Promise<PermissionConfig | null> {
    try {
      const configFileContent = fs.readFileSync(configPath, 'utf8');
      const [, fileContent] = configFileContent.split('=');
      try {
        return JSON.parse(fileContent);
      } catch {
        const configModule = await this.evaluateConfig(fileContent);
        if (!configModule) {
          throw new Error('Could not evaluate configuration file');
        }
        return configModule;
      }
    } catch (error) {
      console.error('Error loading configuration file:', error);
      return null;
    }
  }

  private async evaluateConfig(content: string): Promise<any> {
    try {
      // Remove any import statements and type annotations
      const cleanContent = content
        .replace(/import\s+.*?from\s+['"].*?['"]\s*;?\n?/g, '')
        .replace(/:\s*\w+(?:<[^>]+>)?/g, '')
        .trim();

      // Try different export patterns
      const patterns = [
        // export const config = { ... }
        /export\s+(?:const|let|var)\s+(\w+)\s*=\s*({[\s\S]*?});/,
        // export default { ... }
        /export\s+default\s+({[\s\S]*?});/,
        // module.exports = { ... }
        /module\.exports\s*=\s*({[\s\S]*?});/,
        // const config = { ... }; export default config
        /const\s+(\w+)\s*=\s*({[\s\S]*?});[\s\S]*?export\s+default\s+\1\s*;/,
      ];

      for (const pattern of patterns) {
        const match = cleanContent.match(pattern);
        if (match && (match[1] || match[2])) {
          const configObject = match[2] || match[1];
          return this.safeEval(configObject);
        }
      }

      throw new Error('Could not find configuration object in file');
    } catch (error) {
      console.error('Error evaluating configuration:', error);
      throw error;
    }
  }

  private safeEval(configStr: string): any {
    try {
      // First try to parse as JSON with some preprocessing
      const jsonStr = configStr
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

      try {
        return JSON.parse(jsonStr);
      } catch (jsonError) {
        // If JSON parsing fails, try Function constructor with a safer approach
        const fn = Function(`
          "use strict";
          const windowMs = 900000;
          const enabled = true;
          const max = 100;
          const config = ${configStr};
          return config;
        `);
        return fn();
      }
    } catch (error) {
      console.error('Error evaluating configuration:', error);
      throw error;
    }
  }

  private validateTopLevelConfig(config: any): boolean {
    const requiredProperties = ['database', 'permissions', 'security'];
    for (const prop of requiredProperties) {
      if (!config[prop]) {
        console.error(`Missing required top-level property: ${prop}`);
        return false;
      }
    }

    return true;
  }

  private validateDatabaseConfig(database: any): boolean {
    if (!database.entities) {
      console.error('Missing database entities configuration');
      return false;
    }

    const requiredEntities = ['permissions', 'routerPermissions', 'userPermissions'];
    for (const entity of requiredEntities) {
      if (!database.entities[entity]) {
        console.error(`Missing required entity configuration: ${entity}`);
        return false;
      }

      if (!database.entities[entity].tableName) {
        console.error(`Missing tableName for entity: ${entity}`);
        return false;
      }

      if (!database.entities[entity].fields) {
        console.error(`Missing fields configuration for entity: ${entity}`);
        return false;
      }
    }

    return true;
  }

  private validatePermissionsConfig(permissions: any): boolean {
    const requiredProperties = ['defaultRole', 'adminRole', 'permissionStrategy'];

    for (const prop of requiredProperties) {
      if (!permissions[prop]) {
        console.error(`Missing required permissions property: ${prop}`);
        return false;
      }
    }

    if (
      permissions.permissionStrategy !== 'whitelist' &&
      permissions.permissionStrategy !== 'blacklist'
    ) {
      console.error('Invalid permission strategy. Must be either "whitelist" or "blacklist"');
      return false;
    }

    if (!Array.isArray(permissions.publicRoutes)) {
      console.error('publicRoutes must be an array');
      return false;
    }

    return true;
  }

  private validateSecurityConfig(security: any): boolean {
    const requiredProperties = ['enableCaching', 'cacheTimeout', 'enableAuditLog'];

    for (const prop of requiredProperties) {
      if (security[prop] === undefined) {
        console.error(`Missing required security property: ${prop}`);
        return false;
      }
    }

    if (typeof security.enableCaching !== 'boolean') {
      console.error('enableCaching must be a boolean');
      return false;
    }

    if (typeof security.cacheTimeout !== 'number' || security.cacheTimeout < 0) {
      console.error('cacheTimeout must be a positive number');
      return false;
    }

    if (typeof security.enableAuditLog !== 'boolean') {
      console.error('enableAuditLog must be a boolean');
      return false;
    }

    return true;
  }
}
