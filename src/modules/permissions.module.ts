import { DynamicModule, Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config.module';
import { SecurityModule } from './security.module';
import { ConfigService } from '../services/config.service';
import { PermissionService } from '../services/permission.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionEntity } from '../models/permission.entity';
import { UserPermissionEntity } from '../models/user-permission.entity';
import { RouterPermissionEntity } from '../models/router-permission.entity';
import { PermissionConfig } from '../interfaces/config.interface';
import { SecurityConfig } from '../interfaces/security.interface';
import { SchemaValidatorService } from '../services/schema-validator.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import { AuditService } from '../services/audit.service';
import { AuditLogEntity } from '../models/audit-log.entity';
import { ConfigPublisherService } from '../services/config-publisher.service';
import { SecurityConfigPublisherService } from '../services/security-config-publisher.service';
import { MigrationGeneratorService } from '../services/migration-generator.service';
import { ErrorHandlingModule } from './error-handling.module';
import { APP_GUARD } from '@nestjs/core';

@Module({})
export class PermissionsModule {
  static register(
    config?: Partial<PermissionConfig>,
    securityConfig?: Partial<SecurityConfig>,
  ): DynamicModule {
    const imports: Array<Type<any> | DynamicModule | Promise<DynamicModule>> = [
      ConfigModule.register(config),
      TypeOrmModule.forFeature([
        PermissionEntity,
        UserPermissionEntity,
        RouterPermissionEntity,
        AuditLogEntity,
      ]),
      SecurityModule,
      ErrorHandlingModule,
    ];

    return {
      module: PermissionsModule,
      imports,
      providers: [
        ConfigService,
        PermissionService,
        PermissionsGuard,
        SchemaValidatorService,
        RoleHierarchyService,
        AuditService,
        ConfigPublisherService,
        SecurityConfigPublisherService,
        MigrationGeneratorService,
        {
          provide: 'SECURITY_CONFIG',
          useValue: securityConfig,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionsGuard,
        },
      ],
      exports: [
        PermissionService,
        PermissionsGuard,
        ConfigService,
        SchemaValidatorService,
        RoleHierarchyService,
        AuditService,
        ConfigPublisherService,
        SecurityConfigPublisherService,
        MigrationGeneratorService,
        ConfigModule,
      ],
    };
  }
}
