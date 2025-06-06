# NestJS Dynamic Permissions - Best Practices Guide

## Security Best Practices

### 1. Permission Strategy Selection

- Use `whitelist` strategy in production environments
- Use `blacklist` strategy only during development or for public-facing applications
- Always explicitly define public routes
- Never rely on default permissions for sensitive operations

```typescript
// ✅ Good Practice
{
  permissions: {
    permissionStrategy: 'whitelist',
    publicRoutes: [
      '/auth/login',
      '/auth/register',
      '/public/*'
    ]
  }
}

// ❌ Bad Practice
{
  permissions: {
    permissionStrategy: 'blacklist',
    publicRoutes: ['*']
  }
}
```

### 2. Role Hierarchy

- Implement principle of least privilege
- Keep role hierarchy shallow (max 3-4 levels)
- Use clear naming conventions for roles
- Document role relationships

```typescript
// ✅ Good Practice
{
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
}

// ❌ Bad Practice
{
  roleHierarchy: {
    superAdmin: {
      level: 1000,
      inherits: ['admin', 'manager', 'user', 'guest']
    }
  }
}
```

### 3. Audit Logging

- Enable audit logging in production
- Log all permission changes
- Include relevant metadata
- Implement log rotation
- Regular audit log review

```typescript
// ✅ Good Practice
await auditService.logPermissionChange(
  adminId,
  'role.update',
  'grant',
  userId,
  {
    oldRole: user.role,
    newRole: newRole,
    reason: 'promotion',
    approvedBy: supervisor.id
  }
);

// ❌ Bad Practice
await auditService.logPermissionChange(
  adminId,
  'update',
  'grant',
  userId
);
```

### 1. Security Configuration

- Enable all security features in production
- Configure strict CORS policies
- Use rate limiting to prevent abuse
- Implement proper request validation

```typescript
// ✅ Good Practice - Production Security Config
const securityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: ['https://your-domain.com'],
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    // ... other security headers enabled
  }
};

// ❌ Bad Practice - Insecure Config
const insecureConfig: SecurityConfig = {
  cors: {
    enabled: true,
    allowedOrigins: ['*'],
    allowedMethods: ['*'],
    credentials: true
  },
  helmet: {
    enabled: false
  }
};
```

### 2. Request Validation

- Validate request content types
- Implement request size limits
- Sanitize input data
- Use proper content security policies

```typescript
// ✅ Good Practice - Request Validation
{
  requestValidation: {
    maxBodySize: 5 * 1024 * 1024, // 5MB limit
    requireJsonContent: true,
    validateContentType: true
  }
}

// ❌ Bad Practice - No Validation
{
  requestValidation: {
    maxBodySize: 100 * 1024 * 1024, // Too large
    requireJsonContent: false,
    validateContentType: false
  }
}
```

### 3. Rate Limiting

- Implement rate limiting per IP
- Use appropriate time windows
- Set reasonable request limits
- Handle rate limit errors gracefully

```typescript
// ✅ Good Practice - Rate Limiting
{
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
  }
}

// ❌ Bad Practice - No Rate Limiting
{
  rateLimit: {
    enabled: false
  }
}
```

### 4. CORS Configuration

- Specify exact allowed origins
- Limit allowed methods
- Control allowed headers
- Use credentials carefully

```typescript
// ✅ Good Practice - CORS
{
  cors: {
    enabled: true,
    allowedOrigins: ['https://api.example.com'],
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
}

// ❌ Bad Practice - Permissive CORS
{
  cors: {
    enabled: true,
    allowedOrigins: ['*'],
    allowedMethods: ['*'],
    allowedHeaders: ['*'],
    credentials: true
  }
}
```

### 5. Security Headers

- Enable all relevant security headers
- Configure CSP appropriately
- Use HTTPS-only cookies
- Implement HSTS

```typescript
// ✅ Good Practice - Security Headers
{
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    frameguard: true,
    hsts: true,
    noSniff: true,
    xssFilter: true
  }
}

// ❌ Bad Practice - Missing Headers
{
  helmet: {
    enabled: true,
    contentSecurityPolicy: false,
    hsts: false
  }
}
```

## Performance Optimization

### 1. Caching Strategy

- Enable caching for frequently accessed permissions
- Set appropriate cache TTL
- Implement cache invalidation on permission changes
- Use distributed caching in clustered environments

```typescript
// ✅ Good Practice
{
  security: {
    enableCaching: true,
    cacheTimeout: 1800, // 30 minutes
  }
}

// Cache invalidation
await cacheService.invalidateUserPermissions(userId);
await cacheService.invalidateRolePermissions(roleId);
```

### 2. Database Optimization

- Create proper indexes
- Use efficient field types
- Regular database maintenance
- Monitor query performance

```typescript
// ✅ Good Practice - Index Creation
await queryRunner.query(`
  CREATE INDEX "IDX_permissions_role_user" 
  ON "user_permissions" ("role_id", "user_id");
`);

// ✅ Good Practice - Field Types
{
  fields: {
    id: 'uuid',
    isActive: 'boolean',
    level: 'integer',
    createdAt: 'timestamp'
  }
}
```

## Code Organization

### 1. Module Structure

- Separate concerns into distinct modules
- Use feature modules for complex permission logic
- Implement custom providers when needed
- Follow NestJS module patterns

```typescript
// ✅ Good Practice
@Module({
  imports: [
    PermissionsModule.register({
      // Core configuration
    }),
    UserPermissionsModule,
    RoleHierarchyModule,
    AuditModule
  ]
})
export class AppModule {}
```

### 2. Service Organization

- Single responsibility principle
- Clear service boundaries
- Dependency injection
- Service documentation

```typescript
// ✅ Good Practice
@Injectable()
export class RoleHierarchyService {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService
  ) {}

  async updateRoleHierarchy(role: string, inherits: string[]) {
    // Implementation
  }
}
```

## Configuration Management

### 1. Environment-Specific Configuration

- Use different configurations per environment
- Store sensitive data in environment variables
- Validate configurations at startup
- Document configuration options

```typescript
// ✅ Good Practice
const config = {
  development: require('./permissions.dev.config'),
  staging: require('./permissions.staging.config'),
  production: require('./permissions.prod.config')
}[process.env.NODE_ENV || 'development'];

PermissionsModule.register(config)
```

### 2. Migration Management

- Version control migrations
- Test migrations in staging
- Backup before migration
- Document migration changes

```typescript
// ✅ Good Practice
npx nestjs-permissions generate-migration \
  -f v1 \
  -t v2 \
  -n add_role_hierarchy \
  -d src/migrations
```

## Error Handling

### 1. Permission Errors

- Use specific error types
- Provide clear error messages
- Include troubleshooting information
- Log errors appropriately

```typescript
// ✅ Good Practice
export class PermissionDeniedException extends HttpException {
  constructor(permission: string, userId: string) {
    super(
      {
        message: `User ${userId} lacks permission: ${permission}`,
        errorCode: 'PERMISSION_DENIED',
        requiredPermission: permission
      },
      HttpStatus.FORBIDDEN
    );
  }
}
```

### 2. Configuration Errors

- Validate configuration at startup
- Provide clear validation messages
- Include configuration debugging info
- Fail fast on invalid configuration

```typescript
// ✅ Good Practice
async validateConfig(config: PermissionConfig): Promise<void> {
  const errors = [];
  
  if (!config.database?.entities) {
    errors.push('Missing database entity configuration');
  }
  
  if (!config.permissions?.roleHierarchy) {
    errors.push('Missing role hierarchy configuration');
  }
  
  if (errors.length > 0) {
    throw new ConfigurationError(errors);
  }
}
```

## Testing

### 1. Unit Testing

- Test permission logic in isolation
- Mock dependencies
- Test edge cases
- Use test fixtures

```typescript
// ✅ Good Practice
describe('PermissionService', () => {
  it('should grant permission', async () => {
    const result = await service.grantPermission(userId, permission);
    expect(result).toBeDefined();
    expect(auditService.log).toHaveBeenCalled();
  });
});
```

### 2. Integration Testing

- Test complete permission flow
- Test configuration changes
- Test migrations
- Use real database

```typescript
// ✅ Good Practice
describe('Permission Integration', () => {
  it('should apply migration', async () => {
    const migration = await generateMigration(oldConfig, newConfig);
    await applyMigration(migration);
    const permissions = await getPermissions();
    expect(permissions).toMatchSnapshot();
  });
});
``` 