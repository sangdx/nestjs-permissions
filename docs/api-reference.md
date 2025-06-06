# NestJS Dynamic Permissions - API Reference

## Core Services

### ConfigPublisherService

Service for managing and publishing permission configurations.

```typescript
class ConfigPublisherService {
  // Publish configuration to a project
  async publishConfigToProject(
    projectPath: string,
    template: string = 'basic',
    customizations?: Partial<PermissionConfig>
  ): Promise<void>

  // Update existing project configuration
  async updateProjectConfig(
    projectPath: string,
    updates: Partial<PermissionConfig>
  ): Promise<void>

  // Get list of available configuration templates
  getAvailableTemplates(): ConfigTemplate[]
}
```

### MigrationGeneratorService

Service for generating and managing database migrations.

```typescript
class MigrationGeneratorService {
  // Generate migration between two configurations
  async generateMigration(
    oldConfig: PermissionConfig,
    newConfig: PermissionConfig,
    options?: MigrationOptions
  ): Promise<string>

  // Generate table creation SQL
  generateCreateTables(config: PermissionConfig): string

  // Generate table alteration SQL
  generateAlterTables(
    oldConfig: PermissionConfig,
    newConfig: PermissionConfig
  ): string[]

  // Generate database indexes
  generateIndexes(config: PermissionConfig): string[]
}
```

## CLI Commands

### Initialize Project

Initialize permissions configuration in a project:

```bash
nestjs-permissions init [options]

Options:
  -p, --project-path <path>    Path to the project root (default: ".")
  -t, --template <template>    Configuration template to use (default: "basic")
```

### Publish Configuration

Publish a configuration template to a project:

```bash
nestjs-permissions publish-config [options]

Options:
  -p, --project-path <path>     Path to the project root (default: ".")
  -t, --template <template>     Configuration template to use (default: "basic")
  -c, --customizations <json>   Custom configuration overrides (JSON string)
```

### Generate Migration

Generate a migration between two configurations:

```bash
nestjs-permissions generate-migration [options]

Options:
  -p, --project-path <path>    Path to the project root (default: ".")
  -f, --from <version>         Source configuration version
  -t, --to <version>          Target configuration version
  -n, --name <name>           Migration name
  -d, --directory <directory>  Migration directory (default: "migrations")
```

### Validate Configuration

Validate a configuration file:

```bash
nestjs-permissions validate-config [options]

Options:
  -p, --project-path <path>    Path to the project root (default: ".")
  -c, --config-path <path>     Path to configuration file (default: "config/permissions.config.js")
```

### List Templates

List available configuration templates:

```bash
nestjs-permissions list-templates
```

## Configuration Templates

### Basic Template
```typescript
{
  database: {
    type: 'mysql',
    entities: {
      permissions: {
        tableName: 'permissions',
        fields: { /* basic fields */ }
      }
      // ... other entities
    }
  },
  permissions: {
    defaultRole: 'user',
    adminRole: 'admin',
    publicRoutes: [],
    permissionStrategy: 'blacklist'
  },
  security: {
    enableCaching: false,
    cacheTimeout: 3600,
    enableAuditLog: false
  }
}
```

### Advanced Template
```typescript
{
  // Includes role hierarchy and caching
  security: {
    enableCaching: true,
    cacheTimeout: 3600,
    enableAuditLog: true
  }
  // ... other settings
}
```

### Enterprise Template
```typescript
{
  // Full security features
  security: {
    enableCaching: true,
    cacheTimeout: 1800,
    enableAuditLog: true
  },
  permissions: {
    permissionStrategy: 'whitelist'
  }
  // ... other settings
}
```

## Interfaces

### PermissionConfig
```typescript
interface PermissionConfig {
  database: {
    type: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
    entities: {
      permissions: EntityConfig;
      routerPermissions: EntityConfig;
      userPermissions: EntityConfig;
    };
  };
  permissions: {
    defaultRole: string;
    adminRole: string;
    publicRoutes: string[];
    permissionStrategy: 'whitelist' | 'blacklist';
  };
  security: {
    enableCaching: boolean;
    cacheTimeout: number;
    enableAuditLog: boolean;
  };
}
```

### MigrationOptions
```typescript
interface MigrationOptions {
  timestamp?: boolean;
  directory?: string;
  name?: string;
}
```

### ConfigTemplate
```typescript
interface ConfigTemplate {
  name: string;
  description: string;
  config: Partial<PermissionConfig>;
}
```

## Security Configuration

### SecurityConfig Interface
```typescript
interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  requestValidation: {
    maxBodySize: number;
    requireJsonContent: boolean;
    validateContentType: boolean;
  };
}
```

### ConfigService Security Methods

```typescript
class ConfigService {
  // Get current security configuration
  getSecurityConfig(): SecurityConfig

  // Update security configuration
  updateSecurityConfig(config: Partial<SecurityConfig>): void
}
```

### Security Module

```typescript
// Register security features
@Module({
  imports: [
    PermissionsModule.register(permissionConfig, securityConfig)
  ]
})
```

### Default Security Configuration

```typescript
const defaultSecurityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true
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
    xssFilter: true
  },
  requestValidation: {
    maxBodySize: 10 * 1024 * 1024,
    requireJsonContent: true,
    validateContentType: true
  }
}
``` 