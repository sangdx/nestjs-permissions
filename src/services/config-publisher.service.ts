import { Injectable } from '@nestjs/common';
import { PermissionConfig } from '../interfaces/config.interface';
import { defaultConfig } from '../config/default-config';
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
      description: 'Simple permission configuration with minimal setup',
      config: defaultConfig,
    },
    advanced: {
      name: 'Advanced Configuration',
      description: 'Advanced configuration with role hierarchy and caching',
      config: {
        ...defaultConfig,
        security: {
          enableCaching: true,
          cacheTimeout: 3600,
          enableAuditLog: true,
        },
      },
    },
    enterprise: {
      name: 'Enterprise Configuration',
      description: 'Full-featured configuration with all security features enabled',
      config: {
        ...defaultConfig,
        security: {
          enableCaching: true,
          cacheTimeout: 1800,
          enableAuditLog: true,
        },
        permissions: {
          ...defaultConfig.permissions,
          permissionStrategy: 'whitelist',
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

    // Write configuration file
    const configPath = path.join(configDir, 'permissions.config.js');
    const configContent = this.generateConfigFile(finalConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');

    // Write TypeScript types
    const typesPath = path.join(configDir, 'permissions.config.d.ts');
    const typesContent = this.generateTypesFile();
    fs.writeFileSync(typesPath, typesContent, 'utf8');
  }

  async updateProjectConfig(
    projectPath: string,
    updates: Partial<PermissionConfig>,
  ): Promise<void> {
    const configPath = path.join(projectPath, 'config', 'permissions.config.js');

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
    return `// @ts-check
import { PermissionConfig } from '@nestjs/permissions';

/** @type {import('./permissions.config').PermissionConfig} */
const config = ${JSON.stringify(config, null, 2)};

export default config;
`;
  }

  private generateTypesFile(): string {
    return `import { PermissionConfig } from '@nestjs/permissions';

declare const config: PermissionConfig;
export = config;
`;
  }

  private writeConfigToFile(config: PermissionConfig, filePath: string): void {
    const configDir = path.dirname(filePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  }
}
