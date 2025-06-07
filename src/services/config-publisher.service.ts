import { Injectable } from '@nestjs/common';
import { PermissionConfig } from '../interfaces/config.interface';
import { defaultConfig } from '../config/default-config';
import { defaultSecurityConfig } from '../config/default-security.config';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigTemplate {
  name: string;
  description: string;
  config: Partial<PermissionConfig>;
}

@Injectable()
export class ConfigPublisherService {
  private readonly templates: Record<string, ConfigTemplate> = {
    basic: {
      name: 'Basic Configuration',
      description: 'Basic configuration with essential features',
      config: defaultConfig,
    },
    strict: {
      name: 'Strict Configuration',
      description: 'Enhanced configuration with stricter settings',
      config: {
        ...defaultConfig,
        security: {
          ...defaultSecurityConfig,
          rateLimit: {
            enabled: true,
            windowMs: 15 * 60 * 1000,
            max: 50, // Stricter rate limit
          },
          cors: {
            enabled: true,
            allowedOrigins: [], // Must be explicitly set
            allowedMethods: ['GET', 'POST'], // Limited methods
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: [],
            credentials: true,
          },
          helmet: {
            ...defaultSecurityConfig.helmet,
            contentSecurityPolicy: true,
            crossOriginEmbedderPolicy: true,
            hsts: true,
          },
          requestValidation: {
            maxBodySize: 5 * 1024 * 1024, // 5MB limit
            requireJsonContent: true,
            validateContentType: true,
          },
          enableCaching: true,
          cacheTimeout: 1800, // 30 minutes
          enableAuditLog: true,
        },
      },
    },
    enterprise: {
      name: 'Enterprise Configuration',
      description: 'Full-featured configuration for enterprise applications',
      config: {
        ...defaultConfig,
        security: {
          ...defaultSecurityConfig,
          rateLimit: {
            enabled: true,
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 100,
          },
          cors: {
            enabled: true,
            allowedOrigins: [],
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
            exposedHeaders: ['X-Total-Count', 'X-Rate-Limit'],
            credentials: true,
          },
          helmet: {
            enabled: true,
            contentSecurityPolicy: true,
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: true,
            dnsPrefetchControl: true,
            frameguard: true,
            hidePoweredBy: true,
            hsts: true,
            ieNoOpen: true,
            noSniff: true,
            referrerPolicy: true,
            xssFilter: true,
          },
          requestValidation: {
            maxBodySize: 10 * 1024 * 1024,
            requireJsonContent: true,
            validateContentType: true,
          },
          enableCaching: true,
          cacheTimeout: 7200, // 2 hours
          enableAuditLog: true,
        },
      },
    },
  };

  async publishConfigToProject(
    projectPath: string,
    template = 'basic',
    customizations?: Partial<PermissionConfig>,
  ): Promise<void> {
    // Validate template
    if (!this.templates[template]) {
      throw new Error(`Template "${template}" not found`);
    }

    // Create config directory if it doesn't exist
    const configDir = path.join(projectPath, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Merge configurations
    const baseConfig = this.templates[template].config;
    const finalConfig = customizations ? this.mergeConfigs(baseConfig, customizations) : baseConfig;

    // Write configuration typescript file
    const configPath = path.join(configDir, 'permissions.config.ts');
    const configContent = this.generateConfigFile(finalConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  async updateProjectConfig(
    projectPath: string,
    updates: Partial<PermissionConfig>,
  ): Promise<void> {
    const configPath = path.join(projectPath, 'config', 'permissions.config.ts');

    // Check if config exists
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuration file not found');
    }

    // Load existing config
    const currentConfig = await import(configPath);

    // Merge updates
    const updatedConfig = this.mergeConfigs(currentConfig, updates);

    // Write updated config
    const configContent = this.generateConfigFile(updatedConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  getAvailableTemplates(): ConfigTemplate[] {
    return Object.values(this.templates);
  }

  private mergeConfigs(
    base: Partial<PermissionConfig>,
    updates: Partial<PermissionConfig>,
  ): PermissionConfig {
    return {
      database: {
        ...base.database,
        ...updates.database,
        entities: {
          permissions: {
            ...base.database?.entities?.permissions,
            ...updates.database?.entities?.permissions,
          },
          routerPermissions: {
            ...base.database?.entities?.routerPermissions,
            ...updates.database?.entities?.routerPermissions,
          },
          userPermissions: {
            ...base.database?.entities?.userPermissions,
            ...updates.database?.entities?.userPermissions,
          },
        },
      },
      permissions: {
        ...base.permissions,
        ...updates.permissions,
        publicRoutes: [
          ...(base.permissions?.publicRoutes || []),
          ...(updates.permissions?.publicRoutes || []),
        ],
      },
      security: {
        ...base.security,
        ...updates.security,
      },
    } as PermissionConfig;
  }

  private generateConfigFile(config: Partial<PermissionConfig>): string {
    const configStr = JSON.stringify(config, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");
    return `export const config = ${configStr}`;
  }

  private writeConfigToFile(config: PermissionConfig, filePath: string): void {
    const configDir = path.dirname(filePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  }
}
