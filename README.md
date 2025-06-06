# NestJS Dynamic Permissions

A flexible and powerful permissions management system for NestJS applications with built-in security features.

## Features

### Permission Management
- Dynamic role-based access control (RBAC)
- Fine-grained permission control
- Role hierarchy support
- Public routes configuration
- Permission strategy (whitelist/blacklist)

### Security Features
- Rate limiting protection
- CORS configuration
- Helmet security headers
- Request validation
- Multiple security templates (Basic, Strict, Enterprise)

### Configuration Management
- Multiple configuration templates
- Configuration publishing
- Easy updates and migrations
- TypeScript type definitions
- Environment-specific settings

### Error Handling
- Centralized error handling
- Custom exception classes
- Standardized error responses
- Environment-specific error details

### Audit & Monitoring
- Audit logging
- Performance monitoring
- Security event tracking
- Detailed logging system

## Installation

```bash
npm install @nestjs/permissions
```

## Quick Start

### 1. Initialize Configuration

```bash
# Initialize with basic configuration
npx nestjs-permissions init

# Or use a specific template
npx nestjs-permissions init -t advanced
```

### 2. Module Setup

```typescript
import { PermissionsModule } from '@nestjs/permissions';

@Module({
  imports: [
    PermissionsModule.register()
  ]
})
export class AppModule {}
```

### 3. Apply Permissions

```typescript
import { RequirePermission } from '@nestjs/permissions';

@Controller('users')
export class UserController {
  @RequirePermission(['user.read'])
  @Get()
  findAll() {
    return this.userService.findAll();
  }
}
```

## Security Configuration

### 1. Initialize Security Settings

```bash
# Publish security configuration
npx nestjs-permissions publish-security-config

# Use strict security template
npx nestjs-permissions publish-security-config -t strict
```

### 2. Available Security Templates

- **Basic**: Essential security features
- **Strict**: Enhanced security with stricter settings
- **Enterprise**: Full-featured security for enterprise applications

### 3. Security Features

```typescript
const securityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  cors: {
    enabled: true,
    allowedOrigins: ['https://your-domain.com'],
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  helmet: {
    enabled: true,
    contentSecurityPolicy: true,
    // ... other security headers
  },
  requestValidation: {
    maxBodySize: 10 * 1024 * 1024,
    requireJsonContent: true,
    validateContentType: true
  }
};
```

## CLI Commands

### Configuration Management
```bash
# Initialize project
npx nestjs-permissions init

# Publish configuration
npx nestjs-permissions publish-config

# Generate migration
npx nestjs-permissions generate-migration

# Validate configuration
npx nestjs-permissions validate-config
```

### Security Management
```bash
# Publish security configuration
npx nestjs-permissions publish-security-config

# Update security settings
npx nestjs-permissions update-security-config

# List security templates
npx nestjs-permissions list-security-templates
```

## Documentation

- [API Reference](docs/api-reference.md)
- [Usage Examples](docs/usage-examples.md)
- [Best Practices](docs/best-practices.md)
- [Performance Tuning](docs/performance-tuning.md)
- [Troubleshooting](docs/troubleshooting.md)

## Error Handling

The package includes comprehensive error handling with custom exceptions:

- `PermissionDeniedException`
- `InvalidPermissionException`
- `RoleNotFoundException`
- `ConfigurationException`
- `DatabaseException`
- `MigrationException`
- `CacheException`
- `ValidationException`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please:
- Check the [Troubleshooting Guide](docs/troubleshooting.md)
- Open an issue on GitHub
- Join our Discord community

## Acknowledgments

- NestJS team for the amazing framework
- Contributors who helped shape this package
- Community feedback and support 