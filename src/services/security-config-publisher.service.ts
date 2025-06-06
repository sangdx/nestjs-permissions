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
    const configPath = path.join(configDir, 'security.config.ts');
    const configContent = this.generateConfigFile(finalConfig);
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  async updateProjectSecurityConfig(
    projectPath: string,
    updates: Partial<SecurityConfig>,
  ): Promise<void> {
    const configPath = path.join(projectPath, 'config', 'security.config.ts');

    // Check if config exists
    if (!fs.existsSync(configPath)) {
      throw new Error('Security configuration file not found');
    }

    try {
      // Read existing config
      const configContent = fs.readFileSync(configPath, 'utf8');

      // Parse the existing config
      const currentConfig = this.parseConfigFile(configContent);

      // Merge updates
      const updatedConfig = this.mergeConfigs(currentConfig, updates);

      // Write updated config
      const newConfigContent = this.generateConfigFile(updatedConfig);
      fs.writeFileSync(configPath, newConfigContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to update security config: ${error.message}`);
    }
  }

  getAvailableTemplates(): SecurityTemplate[] {
    return Object.values(this.templates);
  }

  private generateConfigFile(config: Partial<SecurityConfig>): string {
    // Ensure the config has all required properties with default values
    const fullConfig: SecurityConfig = {
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        max: 100,
        ...config.rateLimit,
      },
      cors: {
        enabled: true,
        allowedOrigins: [],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count'],
        credentials: true,
        ...config.cors,
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
        ...config.helmet,
      },
      requestValidation: {
        maxBodySize: 10 * 1024 * 1024,
        requireJsonContent: true,
        validateContentType: true,
        ...config.requestValidation,
      },
    };

    return `import { SecurityConfig } from '@brandazm/dynamic-permissions';\n\nexport const securityConfig: SecurityConfig = ${JSON.stringify(
      fullConfig,
      null,
      2,
    )};\n`;
  }

  private parseConfigFile(content: string): SecurityConfig {
    try {
      // Remove imports and exports
      const configString = content
        .replace(/import.*?;/g, '')
        .replace(/export.*?const.*?=/, '')
        .replace(/;$/, '')
        .trim();

      return JSON.parse(configString);
    } catch (error) {
      throw new Error('Failed to parse security config file');
    }
  }

  private mergeConfigs(
    base: Partial<SecurityConfig>,
    updates: Partial<SecurityConfig>,
  ): SecurityConfig {
    return {
      ...base,
      ...updates,
      rateLimit: {
        ...base.rateLimit,
        ...updates.rateLimit,
      },
      cors: {
        ...base.cors,
        ...updates.cors,
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
}
