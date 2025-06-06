# NestJS Dynamic Permissions - Troubleshooting Guide

## Common Issues and Solutions

### 1. Permission Denied Errors

#### Symptoms
- Routes return 403 Forbidden
- Permission checks fail unexpectedly
- Access denied to previously accessible resources

#### Solutions

1. **Check Permission Configuration**
```typescript
// Verify permission strategy
console.log(await configService.getConfig().permissions.permissionStrategy);

// Check public routes
console.log(await configService.getConfig().permissions.publicRoutes);
```

2. **Verify Role Hierarchy**
```typescript
// Debug role inheritance
const roleHierarchy = await roleHierarchyService.buildRoleTree();
console.log(JSON.stringify(roleHierarchy, null, 2));
```

3. **Check User Permissions**
```typescript
// Get user's effective permissions
const permissions = await permissionService.getUserPermissions(userId);
console.log('User Permissions:', permissions);
```

### 2. Configuration Issues

#### Symptoms
- Module fails to initialize
- Invalid configuration errors
- Missing field errors

#### Solutions

1. **Validate Configuration Structure**
```bash
# Use CLI validation tool
npx nestjs-permissions validate-config

# Check configuration file
cat config/permissions.config.js
```

2. **Debug Configuration Loading**
```typescript
// Add debug logging
PermissionsModule.register({
  ...config,
  debug: true
});
```

3. **Check Environment Configuration**
```typescript
// Verify environment-specific config
const env = process.env.NODE_ENV || 'development';
console.log(`Loading config for environment: ${env}`);
```

### 3. Migration Problems

#### Symptoms
- Migration fails to apply
- Database schema mismatch
- Column type conflicts

#### Solutions

1. **Generate Migration Debug Info**
```bash
# Generate migration with debug info
npx nestjs-permissions generate-migration -f v1 -t v2 --debug
```

2. **Check Database State**
```sql
-- Check current schema
SELECT * FROM information_schema.tables;
SELECT * FROM information_schema.columns;
```

3. **Manual Migration Verification**
```typescript
// Verify migration content
const migration = await migrationGeneratorService.generateMigration(
  oldConfig,
  newConfig,
  { dryRun: true }
);
console.log('Migration SQL:', migration);
```

### 4. Performance Issues

#### Symptoms
- Slow permission checks
- High database load
- Cache misses

#### Solutions

1. **Enable Performance Logging**
```typescript
// Add performance monitoring
{
  security: {
    enablePerformanceLogging: true,
    logSlowQueries: true
  }
}
```

2. **Check Cache Status**
```typescript
// Monitor cache hits/misses
const cacheStats = await cacheService.getStats();
console.log('Cache Performance:', cacheStats);
```

3. **Optimize Database Queries**
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM permissions WHERE user_id = ?;
```

### 5. Audit Log Issues

#### Symptoms
- Missing audit logs
- Incomplete audit information
- Audit log performance impact

#### Solutions

1. **Verify Audit Configuration**
```typescript
// Check audit settings
const auditConfig = await configService.getConfig().security;
console.log('Audit Enabled:', auditConfig.enableAuditLog);
```

2. **Debug Audit Logging**
```typescript
// Add audit debug info
await auditService.logPermissionChange(
  userId,
  action,
  target,
  {
    debug: true,
    stackTrace: true
  }
);
```

3. **Monitor Audit Performance**
```typescript
// Check audit log size
const auditStats = await auditService.getStats();
console.log('Audit Log Size:', auditStats.size);
```

### 6. Security Issues

#### Symptoms
- CORS errors in browser console
- Rate limit exceeded errors
- Invalid content type errors
- Security header warnings

#### Solutions

1. **CORS Issues**
```typescript
// Check CORS configuration
const corsConfig = await configService.getSecurityConfig().cors;
console.log('CORS Config:', corsConfig);

// Verify allowed origins
if (!corsConfig.allowedOrigins.includes(origin)) {
  console.log(`Origin ${origin} not allowed`);
}
```

2. **Rate Limiting Problems**
```typescript
// Check rate limit configuration
const rateLimitConfig = await configService.getSecurityConfig().rateLimit;
console.log('Rate Limit Config:', rateLimitConfig);

// Monitor rate limit hits
const hits = await rateLimiter.get(ip);
console.log(`Rate limit hits for ${ip}:`, hits);
```

3. **Content Type Validation**
```typescript
// Debug content type validation
const contentType = req.headers['content-type'];
const isValid = contentType?.includes('application/json');
console.log('Content Type:', contentType);
console.log('Is Valid:', isValid);

// Check request validation config
const validationConfig = await configService.getSecurityConfig().requestValidation;
console.log('Validation Config:', validationConfig);
```

4. **Security Headers**
```typescript
// Verify security headers
const helmetConfig = await configService.getSecurityConfig().helmet;
console.log('Helmet Config:', helmetConfig);

// Check applied headers
const appliedHeaders = res.getHeaders();
console.log('Applied Headers:', appliedHeaders);
```

### Common Security Error Messages

| Error Code | Description | Solution |
|------------|-------------|----------|
| `CORS_ORIGIN_BLOCKED` | Origin not allowed by CORS | Add origin to allowedOrigins list |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Adjust rate limit settings or wait |
| `INVALID_CONTENT_TYPE` | Wrong content type header | Use application/json for POST/PUT |
| `CSP_VIOLATION` | Content Security Policy violation | Check CSP configuration |

### Security Debugging Tools

```bash
# Test CORS configuration
curl -H "Origin: http://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://your-api.com/endpoint

# Check rate limiting
ab -n 1000 -c 10 http://your-api.com/endpoint

# Verify security headers
curl -I http://your-api.com/endpoint
```

### Security Configuration Validation

```typescript
// src/services/config.service.ts
validateSecurityConfig(config: SecurityConfig): void {
  // Validate CORS config
  if (config.cors.enabled) {
    if (!Array.isArray(config.cors.allowedOrigins)) {
      throw new Error('allowedOrigins must be an array');
    }
  }

  // Validate rate limit config
  if (config.rateLimit.enabled) {
    if (config.rateLimit.windowMs < 0) {
      throw new Error('windowMs must be positive');
    }
    if (config.rateLimit.max < 1) {
      throw new Error('max must be at least 1');
    }
  }

  // Validate request validation config
  if (config.requestValidation.maxBodySize < 0) {
    throw new Error('maxBodySize must be positive');
  }
}
```

### Security Monitoring

```typescript
// src/monitoring/security.monitor.ts
@Injectable()
export class SecurityMonitor {
  private readonly metrics = {
    corsViolations: 0,
    rateLimitHits: 0,
    contentTypeErrors: 0,
    cspViolations: 0
  };

  logCorsViolation(origin: string): void {
    this.metrics.corsViolations++;
    console.warn(`CORS violation from origin: ${origin}`);
  }

  logRateLimitHit(ip: string): void {
    this.metrics.rateLimitHits++;
    console.warn(`Rate limit exceeded for IP: ${ip}`);
  }

  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }
}
```

## Error Messages Reference

### Permission Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `PERMISSION_DENIED` | User lacks required permission | Check user roles and permissions |
| `INVALID_PERMISSION` | Permission does not exist | Verify permission configuration |
| `ROLE_NOT_FOUND` | Role does not exist in hierarchy | Check role hierarchy configuration |

### Configuration Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `CONFIG_INVALID` | Invalid configuration structure | Validate against schema |
| `FIELD_MISSING` | Required field not found | Check configuration completeness |
| `TYPE_MISMATCH` | Field type does not match schema | Verify field types |

### Migration Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `MIGRATION_FAILED` | Migration could not be applied | Check database state |
| `SCHEMA_MISMATCH` | Database schema conflict | Verify current schema |
| `ROLLBACK_FAILED` | Migration rollback failed | Manual intervention needed |

## Debugging Tools

### CLI Debugging Commands

```bash
# Enable debug mode
DEBUG=permissions* npx nestjs-permissions <command>

# Show verbose output
npx nestjs-permissions <command> --verbose

# Dry run mode
npx nestjs-permissions <command> --dry-run
```

### Runtime Debugging

```typescript
// Enable debug logging
PermissionsModule.register({
  debug: {
    logLevel: 'debug',
    logQueries: true,
    logPermissions: true
  }
});
```

### Performance Monitoring

```typescript
// Add performance hooks
PermissionsModule.register({
  monitoring: {
    enableMetrics: true,
    slowQueryThreshold: 100, // ms
    logMemoryUsage: true
  }
});
```

## Support Resources

1. **Documentation**
   - API Reference: `/docs/api-reference.md`
   - Usage Examples: `/docs/usage-examples.md`
   - Best Practices: `/docs/best-practices.md`

2. **Issue Reporting**
   - GitHub Issues: [github.com/nestjs/permissions/issues](https://github.com/nestjs/permissions/issues)
   - Bug Report Template: `.github/ISSUE_TEMPLATE/bug_report.md`

3. **Community Support**
   - Discord Channel: [NestJS Discord](https://discord.gg/nestjs)
   - Stack Overflow: Tag `[nestjs-permissions]` 