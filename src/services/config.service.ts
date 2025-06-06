import { Injectable } from '@nestjs/common';
import { PermissionConfig } from '../interfaces/config.interface';
import { defaultConfig } from '../config/default-config';
import * as path from 'path';
import * as fs from 'fs';
import { SecurityConfig } from '../interfaces/security.interface';
import { defaultSecurityConfig } from '../config/default-security.config';
import { ConfigurationException } from '../exceptions/configuration.exception';

@Injectable()
export class ConfigService {
  private config: PermissionConfig;
  private securityConfig: SecurityConfig;

  constructor() {
    this.config = { ...defaultConfig };
    this.securityConfig = defaultSecurityConfig;
  }

  async loadConfig(projectPath?: string): Promise<PermissionConfig> {
    if (!projectPath) {
      return this.config;
    }

    try {
      const configPath = path.join(projectPath, 'permission.config.js');
      if (fs.existsSync(configPath)) {
        const userConfig = await import(configPath);
        this.config = this.mergeWithDefaults(userConfig);
        this.validateConfig(this.config);
      }
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }

    return this.config;
  }

  validateConfig(config: any): boolean {
    // Basic validation
    if (!config.database || !config.permissions || !config.security) {
      throw new Error('Invalid configuration: missing required sections');
    }

    // Database validation
    if (!['mysql', 'postgres', 'sqlite', 'mongodb'].includes(config.database.type)) {
      throw new Error('Invalid database type');
    }

    // Entities validation
    const requiredEntities = ['permissions', 'routerPermissions', 'userPermissions'];
    for (const entity of requiredEntities) {
      if (
        !config.database.entities[entity]?.tableName ||
        !config.database.entities[entity]?.fields
      ) {
        throw new Error(`Invalid configuration: missing ${entity} configuration`);
      }
    }

    // Permission strategy validation
    if (!['whitelist', 'blacklist'].includes(config.permissions.permissionStrategy)) {
      throw new Error('Invalid permission strategy');
    }

    return true;
  }

  mergeWithDefaults(userConfig: Partial<PermissionConfig>): PermissionConfig {
    return {
      database: {
        ...defaultConfig.database,
        ...userConfig.database,
        entities: {
          permissions: {
            ...defaultConfig.database.entities.permissions,
            ...userConfig.database?.entities?.permissions,
          },
          routerPermissions: {
            ...defaultConfig.database.entities.routerPermissions,
            ...userConfig.database?.entities?.routerPermissions,
          },
          userPermissions: {
            ...defaultConfig.database.entities.userPermissions,
            ...userConfig.database?.entities?.userPermissions,
          },
        },
      },
      permissions: {
        ...defaultConfig.permissions,
        ...userConfig.permissions,
        publicRoutes: [
          ...defaultConfig.permissions.publicRoutes,
          ...(userConfig.permissions?.publicRoutes || []),
        ],
      },
      security: {
        ...defaultConfig.security,
        ...userConfig.security,
      },
    };
  }

  getConfig(): PermissionConfig {
    return this.config;
  }

  getSecurityConfig(): SecurityConfig {
    return this.securityConfig;
  }

  updateSecurityConfig(config: Partial<SecurityConfig>): void {
    this.securityConfig = {
      ...this.securityConfig,
      ...config,
      rateLimit: {
        ...this.securityConfig.rateLimit,
        ...(config.rateLimit || {}),
      },
      cors: {
        ...this.securityConfig.cors,
        ...(config.cors || {}),
      },
      helmet: {
        ...this.securityConfig.helmet,
        ...(config.helmet || {}),
      },
      requestValidation: {
        ...this.securityConfig.requestValidation,
        ...(config.requestValidation || {}),
      },
    };
  }

  private loadConfigFromFile(filePath: string): PermissionConfig {
    if (!fs.existsSync(filePath)) {
      throw new ConfigurationException(`Configuration file not found at ${filePath}`);
    }
    const configContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(configContent);
  }
}
