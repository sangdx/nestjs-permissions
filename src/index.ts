// Interfaces
export * from './interfaces/permission.interface';
export * from './interfaces/user.interface';
export * from './interfaces/router.interface';
export * from './interfaces/config.interface';

// Models
export * from './models/permission.entity';
export * from './models/router-permission.entity';
export * from './models/user-permission.entity';
export * from './models/audit-log.entity';

// Services
export * from './services/config.service';
export * from './services/permission.service';
export * from './services/schema-validator.service';
export * from './services/role-hierarchy.service';
export * from './services/audit.service';
export * from './services/config-publisher.service';
export * from './services/security-config-publisher.service';
export * from './services/migration-generator.service';

// Guards
export * from './guards/permissions.guard';

// Decorators
export * from './decorators/require-permission.decorator';

// Modules
export * from './modules/config.module';
export * from './modules/permissions.module';

// Configuration
export * from './config/default-config';

// Utilities
export * from './utils/query-builder.util';

// Re-export TypeORM to ensure version compatibility
export { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'; 