# NestJS Dynamic Permissions - Usage Examples

## Basic Setup

### 1. Install the Package

```bash
npm install @nestjs/permissions
```

### 2. Initialize Configuration

```bash
npx nestjs-permissions init
```

This will create a basic configuration in your project's `config` directory.

### 3. Import the Module

```typescript
import { PermissionsModule } from '@nestjs/permissions';

@Module({
  imports: [
    PermissionsModule.register()
  ]
})
export class AppModule {}
```

## Configuration Examples

### Basic Configuration

```typescript
// config/permissions.config.js
module.exports = {
  database: {
    type: 'mysql',
    entities: {
      permissions: {
        tableName: 'permissions',
        fields: {
          id: 'id',
          name: 'name',
          description: 'description',
          isActive: 'is_active'
        }
      }
    }
  },
  permissions: {
    defaultRole: 'user',
    adminRole: 'admin',
    publicRoutes: ['/auth/login', '/auth/register'],
    permissionStrategy: 'blacklist'
  },
  security: {
    enableCaching: false,
    cacheTimeout: 3600,
    enableAuditLog: false
  }
}
```

### Advanced Configuration with Role Hierarchy

```typescript
// config/permissions.config.js
module.exports = {
  database: {
    type: 'postgres',
    entities: {
      permissions: {
        tableName: 'permissions',
        fields: {
          id: 'id',
          name: 'name',
          description: 'description',
          isActive: 'is_active',
          level: 'permission_level'
        }
      }
    }
  },
  permissions: {
    defaultRole: 'user',
    adminRole: 'admin',
    publicRoutes: ['/auth/*'],
    permissionStrategy: 'whitelist',
    roleHierarchy: {
      admin: {
        level: 100,
        inherits: ['manager']
      },
      manager: {
        level: 50,
        inherits: ['user']
      },
      user: {
        level: 1
      }
    }
  },
  security: {
    enableCaching: true,
    cacheTimeout: 1800,
    enableAuditLog: true
  }
}
```

## Migration Examples

### Generate Migration

```bash
# Generate migration between two versions
npx nestjs-permissions generate-migration -f v1 -t v2 -n add-audit-fields

# Generate migration with custom directory
npx nestjs-permissions generate-migration -f v1 -t v2 -d src/migrations
```

### Example Migration Output

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditFields1234567890 implements MigrationInterface {
  name = '1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN "created_at" timestamp;`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN "updated_at" timestamp;`);
    await queryRunner.query(`CREATE INDEX "IDX_permissions_created_at" ON "permissions" ("created_at");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_permissions_created_at";`);
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "updated_at";`);
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "created_at";`);
  }
}
```

## Using Decorators

### Route Protection

```typescript
import { RequirePermission } from '@nestjs/permissions';

@Controller('users')
export class UserController {
  @RequirePermission(['user.read'])
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @RequirePermission(['user.create'])
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @RequirePermission(['user.update'])
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
```

### Advanced Permission Strategies

```typescript
@Controller('admin')
export class AdminController {
  @RequirePermission({
    permissions: ['admin.access', 'system.manage'],
    strategy: 'AND',
    fallback: 'deny'
  })
  @Get('system')
  getSystemStatus() {
    return this.adminService.getSystemStatus();
  }

  @RequirePermission({
    permissions: ['reports.view', 'analytics.access'],
    strategy: 'OR',
    cache: true
  })
  @Get('reports')
  getReports() {
    return this.reportService.generateReports();
  }
}
```

## Audit Logging

### Enable Audit Logging

```typescript
// config/permissions.config.js
module.exports = {
  security: {
    enableAuditLog: true
  }
}
```

### Using Audit Service

```typescript
@Injectable()
export class UserService {
  constructor(private readonly auditService: AuditService) {}

  async updateUserRole(userId: string, role: string) {
    // Update user role
    await this.userRepository.update(userId, { role });

    // Log the permission change
    await this.auditService.logPermissionChange(
      requestUser.id,
      'role.update',
      'grant',
      userId,
      { oldRole: user.role, newRole: role }
    );
  }
}
```

## Performance Optimization

### Caching Configuration

```typescript
// config/permissions.config.js
module.exports = {
  security: {
    enableCaching: true,
    cacheTimeout: 1800 // 30 minutes
  }
}
```

### Custom Cache Implementation

```typescript
import { CacheService } from '@nestjs/permissions';

@Injectable()
export class CustomCacheService extends CacheService {
  constructor(private readonly redis: Redis) {
    super();
  }

  async get(key: string): Promise<any> {
    return this.redis.get(key);
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttl);
  }
}
```

## Security Configuration Examples

### Basic Security Setup

```typescript
import { PermissionsModule } from '@nestjs/permissions';
import { SecurityConfig } from '@nestjs/permissions/interfaces';

const securityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
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
};

@Module({
  imports: [
    PermissionsModule.register({}, securityConfig)
  ]
})
export class AppModule {}
```

### Production Security Configuration

```typescript
// config/security.production.config.ts
export const productionSecurityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    max: 50 // Stricter rate limiting
  },
  cors: {
    enabled: true,
    allowedOrigins: [
      'https://app.example.com',
      'https://api.example.com'
    ],
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    // Enable all security headers
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
    maxBodySize: 5 * 1024 * 1024, // Stricter size limit
    requireJsonContent: true,
    validateContentType: true
  }
};
```

### Environment-Specific Configuration

```typescript
// config/security.config.ts
import { SecurityConfig } from '@nestjs/permissions/interfaces';

const environments: Record<string, Partial<SecurityConfig>> = {
  development: {
    cors: {
      enabled: true,
      allowedOrigins: ['http://localhost:3000'],
      credentials: true
    },
    rateLimit: {
      enabled: false
    }
  },
  staging: {
    cors: {
      enabled: true,
      allowedOrigins: ['https://staging.example.com'],
      credentials: true
    },
    rateLimit: {
      enabled: true,
      max: 100
    }
  },
  production: {
    cors: {
      enabled: true,
      allowedOrigins: ['https://example.com'],
      credentials: true
    },
    rateLimit: {
      enabled: true,
      max: 50
    }
  }
};

export const getSecurityConfig = (env: string): SecurityConfig => {
  const envConfig = environments[env] || environments.development;
  return {
    ...defaultSecurityConfig,
    ...envConfig
  };
};
```

### Custom Security Configuration

```typescript
// src/security/custom-security.config.ts
import { SecurityConfig } from '@nestjs/permissions/interfaces';

export const customSecurityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200 // 200 requests per 5 minutes
  },
  cors: {
    enabled: true,
    allowedOrigins: [
      'https://app1.example.com',
      'https://app2.example.com',
      /\.example\.com$/
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Custom-Header'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Rate-Limit'
    ],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com']
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: {
      action: 'deny'
    },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true
  },
  requestValidation: {
    maxBodySize: 15 * 1024 * 1024, // 15MB
    requireJsonContent: true,
    validateContentType: true
  }
};
```

## Security Configuration Publishing

### Publishing Security Configuration

```bash
# Initialize with basic security template
npx nestjs-permissions publish-security-config

# Use strict security template
npx nestjs-permissions publish-security-config -t strict

# Use enterprise template with customizations
npx nestjs-permissions publish-security-config -t enterprise -c '{
  "cors": {
    "allowedOrigins": ["https://myapp.com"],
    "allowedMethods": ["GET", "POST"]
  },
  "rateLimit": {
    "max": 200
  }
}'
```

### Updating Security Configuration

```bash
# Update rate limiting settings
npx nestjs-permissions update-security-config -c '{
  "rateLimit": {
    "windowMs": 900000,
    "max": 150
  }
}'

# Update CORS settings
npx nestjs-permissions update-security-config -c '{
  "cors": {
    "allowedOrigins": [
      "https://app1.example.com",
      "https://app2.example.com"
    ]
  }
}'

# Update multiple security settings
npx nestjs-permissions update-security-config -c '{
  "helmet": {
    "contentSecurityPolicy": true,
    "hsts": true
  },
  "requestValidation": {
    "maxBodySize": 15728640
  }
}'
```

### List Available Security Templates

```bash
npx nestjs-permissions list-security-templates

# Output:
# Available security templates:
#
# Basic Security
# Description: Basic security configuration with essential features
#
# Strict Security
# Description: Enhanced security configuration with stricter settings
#
# Enterprise Security
# Description: Full-featured security configuration for enterprise applications
```

### Security Template Examples

#### Basic Security Template
```typescript
// config/security.config.js
const config = {
  rateLimit: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    // ... other helmet options
  },
  requestValidation: {
    maxBodySize: 10485760, // 10MB
    requireJsonContent: true,
    validateContentType: true
  }
};

module.exports = config;
```

#### Strict Security Template
```typescript
// config/security.config.js
const config = {
  rateLimit: {
    enabled: true,
    windowMs: 900000,
    max: 50 // Stricter rate limit
  },
  cors: {
    enabled: true,
    allowedOrigins: [], // Must be explicitly set
    allowedMethods: ['GET', 'POST'], // Limited methods
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    hsts: true
  },
  requestValidation: {
    maxBodySize: 5242880, // 5MB limit
    requireJsonContent: true,
    validateContentType: true
  }
};

module.exports = config;
```

#### Enterprise Security Template
```typescript
// config/security.config.js
const config = {
  rateLimit: {
    enabled: true,
    windowMs: 300000, // 5 minutes
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: [],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Custom-Header'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Rate-Limit'
    ],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com']
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: {
      action: 'deny'
    },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true
  },
  requestValidation: {
    maxBodySize: 15728640, // 15MB
    requireJsonContent: true,
    validateContentType: true
  }
};

module.exports = config;
```

### Programmatic Usage

```typescript
import { SecurityConfigPublisherService } from '@nestjs/permissions';

@Injectable()
class SecurityConfigManager {
  constructor(
    private readonly securityConfigPublisher: SecurityConfigPublisherService
  ) {}

  async initializeSecurityConfig(projectPath: string) {
    // Publish basic security config
    await this.securityConfigPublisher.publishSecurityConfigToProject(
      projectPath,
      'basic'
    );
  }

  async updateSecuritySettings(projectPath: string) {
    // Update specific security settings
    await this.securityConfigPublisher.updateProjectSecurityConfig(
      projectPath,
      {
        rateLimit: {
          max: 200
        },
        cors: {
          allowedOrigins: ['https://myapp.com']
        }
      }
    );
  }

  listSecurityTemplates() {
    // Get available templates
    const templates = this.securityConfigPublisher.getAvailableTemplates();
    return templates;
  }
} 