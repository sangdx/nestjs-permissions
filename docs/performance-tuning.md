# NestJS Dynamic Permissions - Performance Tuning Guide

## Overview

This guide covers strategies and best practices for optimizing the performance of the NestJS Dynamic Permissions package.

## 1. Caching Optimization

### Enable and Configure Caching

```typescript
// config/permissions.config.js
module.exports = {
  security: {
    enableCaching: true,
    cacheTimeout: 1800, // 30 minutes
    cacheStrategy: 'memory' // or 'redis', 'memcached'
  }
}
```

### Implement Distributed Caching

```typescript
// src/cache/redis-cache.service.ts
import { Injectable } from '@nestjs/common';
import { CacheService } from '@nestjs/permissions';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService extends CacheService {
  private readonly redis: Redis;

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      maxRetriesPerRequest: 3
    });
  }

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

### Cache Invalidation Strategy

```typescript
// src/services/permission.service.ts
@Injectable()
export class PermissionService {
  async updatePermission(userId: string, permission: string): Promise<void> {
    // Update permission
    await this.repository.update(/* ... */);

    // Invalidate specific caches
    await this.cacheService.del(`user:${userId}:permissions`);
    await this.cacheService.del(`permission:${permission}:users`);
    
    // Invalidate role-based caches if needed
    const userRoles = await this.getUserRoles(userId);
    for (const role of userRoles) {
      await this.cacheService.del(`role:${role}:permissions`);
    }
  }
}
```

## 2. Database Optimization

### Index Strategy

```typescript
// src/migrations/CreateIndexes.ts
export class CreateIndexes1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite indexes for frequently accessed combinations
    await queryRunner.query(`
      CREATE INDEX "IDX_user_permissions_composite"
      ON "user_permissions" ("user_id", "permission_id", "is_active");
    `);

    // Partial indexes for common queries
    await queryRunner.query(`
      CREATE INDEX "IDX_active_permissions"
      ON "permissions" ("name")
      WHERE "is_active" = true;
    `);

    // B-tree indexes for range queries
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_timestamp"
      ON "audit_logs" USING BTREE ("created_at");
    `);
  }
}
```

### Query Optimization

```typescript
// src/services/permission.service.ts
@Injectable()
export class PermissionService {
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Use specific columns instead of SELECT *
    return this.repository
      .createQueryBuilder('permission')
      .select(['permission.id', 'permission.name', 'permission.isActive'])
      .innerJoin('user_permissions', 'up', 'up.permission_id = permission.id')
      .where('up.user_id = :userId', { userId })
      .andWhere('permission.is_active = :isActive', { isActive: true })
      .cache(true) // Enable query cache
      .getMany();
  }
}
```

### Connection Pooling

```typescript
// src/config/database.config.ts
export const databaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Connection pool settings
  pool: {
    min: 5,
    max: 20,
    acquireTimeout: 15000,
    idleTimeout: 30000
  }
};
```

## 3. Memory Management

### Garbage Collection Optimization

```typescript
// src/main.ts
if (process.env.NODE_ENV === 'production') {
  // Optimize garbage collection for high-throughput
  const v8 = require('v8');
  v8.setFlagsFromString('--max_old_space_size=4096');
  v8.setFlagsFromString('--optimize_for_size');
}
```

### Memory Leak Prevention

```typescript
// src/services/cache.service.ts
@Injectable()
export class CacheService {
  private readonly cache = new Map<string, CacheItem>();
  private readonly maxItems = 10000;

  async set(key: string, value: any, ttl: number): Promise<void> {
    // Implement LRU cache eviction
    if (this.cache.size >= this.maxItems) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000
    });
  }

  // Periodic cleanup
  @Cron('*/15 * * * *')
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
}
```

## 4. Request Processing Optimization

### Batch Processing

```typescript
// src/services/permission.service.ts
@Injectable()
export class PermissionService {
  async batchUpdatePermissions(
    updates: Array<{ userId: string; permissions: string[] }>
  ): Promise<void> {
    // Use transaction for batch updates
    await this.connection.transaction(async manager => {
      const chunks = this.chunkArray(updates, 1000);
      
      for (const chunk of chunks) {
        await manager
          .createQueryBuilder()
          .insert()
          .into('user_permissions')
          .values(chunk)
          .onConflict('DO UPDATE')
          .execute();
      }
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  }
}
```

### Parallel Processing

```typescript
// src/services/permission.service.ts
@Injectable()
export class PermissionService {
  async validateBulkPermissions(
    permissions: string[]
  ): Promise<ValidationResult[]> {
    // Process validations in parallel
    const validationPromises = permissions.map(permission =>
      this.validateSinglePermission(permission)
    );

    return Promise.all(validationPromises);
  }
}
```

## 5. Monitoring and Profiling

### Performance Metrics Collection

```typescript
// src/monitoring/performance.interceptor.ts
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly metrics = new Map<string, PerformanceMetrics>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime();
    const path = context.getArgs()[0].route.path;

    return next.handle().pipe(
      tap(() => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        this.updateMetrics(path, duration);
      })
    );
  }

  private updateMetrics(path: string, duration: number): void {
    const current = this.metrics.get(path) || {
      count: 0,
      totalDuration: 0,
      average: 0,
      max: 0
    };

    current.count++;
    current.totalDuration += duration;
    current.average = current.totalDuration / current.count;
    current.max = Math.max(current.max, duration);

    this.metrics.set(path, current);
  }
}
```

### Query Performance Monitoring

```typescript
// src/monitoring/query.subscriber.ts
@EventSubscriber()
export class QuerySubscriber implements EntitySubscriberInterface {
  private readonly slowQueryThreshold = 100; // ms

  afterQuery(event: QueryEvent): void {
    const duration = event.duration;

    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms):`, {
        query: event.query,
        parameters: event.parameters,
        duration
      });
    }
  }
}
```

## 6. Load Testing Configuration

### Artillery Test Configuration

```yaml
# test/load/config.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 50
  defaults:
    headers:
      Authorization: "Bearer {{token}}"

scenarios:
  - name: "Permission Checks"
    flow:
      - get:
          url: "/api/permissions/check"
          qs:
            userId: "{{$randomString()}}"
            permission: "read:users"
      - think: 1
      - post:
          url: "/api/permissions/grant"
          json:
            userId: "{{$randomString()}}"
            permission: "write:users"
```

### K6 Performance Test

```javascript
// test/load/k6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500']
  }
};

export default function() {
  const res = http.get('http://localhost:3000/api/permissions/check');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
  sleep(1);
}
```

## 7. Security Performance Optimization

### Rate Limiting Optimization

```typescript
// src/config/security.config.ts
const optimizedRateLimit = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Adjust based on your application's needs
    // Add Redis store for distributed rate limiting
    store: new RedisStore({
      client: redisClient,
      prefix: 'rate-limit:',
      windowMs: 15 * 60 * 1000
    })
  }
};
```

### Security Middleware Chain Optimization

```typescript
// src/middleware/security.middleware.ts
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly middlewareChain: MiddlewareFunction[];

  constructor(private readonly configService: ConfigService) {
    // Pre-build middleware chain for better performance
    this.middlewareChain = this.buildMiddlewareChain();
  }

  private buildMiddlewareChain(): MiddlewareFunction[] {
    const chain: MiddlewareFunction[] = [];
    const config = this.configService.getSecurityConfig();

    // Add middleware in order of most to least frequently used
    if (config.requestValidation.validateContentType) {
      chain.push(this.validateRequest.bind(this));
    }
    if (config.helmet.enabled) {
      chain.push(this.helmetMiddleware);
    }
    if (config.rateLimit.enabled) {
      chain.push(this.rateLimiter);
    }
    // Add other middleware...

    return chain;
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Execute pre-built chain
    this.executeChain(req, res, next, 0);
  }

  private executeChain(req: Request, res: Response, next: NextFunction, index: number) {
    if (index >= this.middlewareChain.length) {
      return next();
    }
    this.middlewareChain[index](req, res, (err?: any) => {
      if (err) return next(err);
      this.executeChain(req, res, next, index + 1);
    });
  }
}
```

### CORS Performance Optimization

```typescript
// src/middleware/security.middleware.ts
private optimizeCorsHeaders(origin: string): Record<string, string> {
  // Cache CORS headers per origin
  const cachedHeaders = this.corsHeadersCache.get(origin);
  if (cachedHeaders) {
    return cachedHeaders;
  }

  const config = this.configService.getSecurityConfig().cors;
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': config.allowedMethods.join(','),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(','),
    'Access-Control-Expose-Headers': config.exposedHeaders.join(',')
  };

  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  this.corsHeadersCache.set(origin, headers);
  return headers;
}
```

### Request Validation Optimization

```typescript
// src/middleware/security.middleware.ts
private validateRequest(req: Request): boolean {
  // Use cached content type validation results
  const method = req.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = req.headers['content-type'];
    const cacheKey = `${method}:${contentType}`;
    
    let isValid = this.validationCache.get(cacheKey);
    if (isValid === undefined) {
      isValid = contentType?.includes('application/json') ?? false;
      this.validationCache.set(cacheKey, isValid);
    }
    
    if (!isValid) {
      throw new Error('Invalid Content-Type');
    }
  }

  return true;
}
```

### Security Headers Caching

```typescript
// src/middleware/security.middleware.ts
private getSecurityHeaders(): Record<string, string> {
  // Cache security headers
  if (this.cachedSecurityHeaders) {
    return this.cachedSecurityHeaders;
  }

  const config = this.configService.getSecurityConfig().helmet;
  const headers = {
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (config.hsts) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  this.cachedSecurityHeaders = headers;
  return headers;
}
```

### Memory Usage Optimization

```typescript
// src/services/cache.service.ts
@Injectable()
export class SecurityCacheService {
  private readonly validationCache: LRUCache<string, boolean>;
  private readonly corsHeadersCache: LRUCache<string, Record<string, string>>;

  constructor() {
    // Use LRU cache with size limits
    this.validationCache = new LRUCache({
      max: 1000,
      maxAge: 1000 * 60 * 60 // 1 hour
    });

    this.corsHeadersCache = new LRUCache({
      max: 100,
      maxAge: 1000 * 60 * 60 // 1 hour
    });
  }

  // Cache methods...
}
``` 