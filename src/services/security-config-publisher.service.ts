import { Injectable } from '@nestjs/common';
import { SecurityConfig } from '../interfaces/security.interface';
import { defaultSecurityConfig } from '../config/default-security.config';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityTemplate {
  name: string;
  description: string;
  config: Partial<SecurityConfig>;
}

@Injectable()
export class SecurityConfigPublisherService {
  private readonly templates: Record<string, SecurityTemplate> = {
    basic: {
      name: 'Basic Security',
      description: 'Basic security configuration with essential features',
      config: defaultSecurityConfig,
    },
    strict: {
      name: 'Strict Security',
      description: 'Enhanced security configuration with stricter settings',
      config: {
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
      },
    },
    enterprise: {
      name: 'Enterprise Security',
      description: 'Full-featured security configuration for enterprise applications',
      config: {
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
      },
    },
  };

  async publishSecurityConfigToProject(
    projectPath: string,
    template = 'basic',
    customizations?: Partial<SecurityConfig>,
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
    const configPath = path.join(configDir, 'security.config.js');
    const configContent = this.generateConfigFile(finalConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');

    // Write TypeScript types
    const typesPath = path.join(configDir, 'security.config.d.ts');
    const typesContent = this.generateTypesFile();
    fs.writeFileSync(typesPath, typesContent, 'utf8');
  }

  async updateProjectSecurityConfig(
    projectPath: string,
    updates: Partial<SecurityConfig>,
  ): Promise<void> {
    const configPath = path.join(projectPath, 'config', 'security.config.js');

    // Check if config exists
    if (!fs.existsSync(configPath)) {
      throw new Error('Security configuration file not found');
    }

    // Load existing config
    const currentConfig = await import(configPath);

    // Merge updates
    const updatedConfig = this.mergeConfigs(currentConfig, updates);

    // Write updated config
    const configContent = this.generateConfigFile(updatedConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  getAvailableTemplates(): SecurityTemplate[] {
    return Object.values(this.templates);
  }

  private mergeConfigs(
    base: Partial<SecurityConfig>,
    updates: Partial<SecurityConfig>,
  ): SecurityConfig {
    return {
      rateLimit: {
        ...base.rateLimit,
        ...updates.rateLimit,
      },
      cors: {
        ...base.cors,
        ...updates.cors,
        allowedOrigins: [
          ...(base.cors?.allowedOrigins || []),
          ...(updates.cors?.allowedOrigins || []),
        ],
        allowedMethods: [
          ...(base.cors?.allowedMethods || []),
          ...(updates.cors?.allowedMethods || []),
        ],
        allowedHeaders: [
          ...(base.cors?.allowedHeaders || []),
          ...(updates.cors?.allowedHeaders || []),
        ],
        exposedHeaders: [
          ...(base.cors?.exposedHeaders || []),
          ...(updates.cors?.exposedHeaders || []),
        ],
      },
      helmet: {
        ...base.helmet,
        ...updates.helmet,
      },
      requestValidation: {
        ...base.requestValidation,
        ...updates.requestValidation,
      },
    } as SecurityConfig;
  }

  private generateConfigFile(config: Partial<SecurityConfig>): string {
    return `// @ts-check
import { SecurityConfig } from '@brandazm/dynamic-permissions';

/** @type {import('./security.config').SecurityConfig} */
const config = ${JSON.stringify(config, null, 2)};

export default config;
`;
  }

  private generateTypesFile(): string {
    return `import { SecurityConfig } from '@brandazm/dynamic-permissions';

declare const config: SecurityConfig;
export = config;
`;
  }

  private writeConfigToFile(config: SecurityConfig, filePath: string): void {
    const configDir = path.dirname(filePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  }
}
