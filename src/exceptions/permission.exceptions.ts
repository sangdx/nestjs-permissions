import { HttpException, HttpStatus } from '@nestjs/common';

export class PermissionDeniedException extends HttpException {
  constructor(permission: string, userId: string, metadata?: Record<string, any>) {
    super(
      {
        message: `User ${userId} lacks permission: ${permission}`,
        errorCode: 'PERMISSION_DENIED',
        requiredPermission: permission,
        userId,
        metadata,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidPermissionException extends HttpException {
  constructor(permission: string, reason: string) {
    super(
      {
        message: `Invalid permission: ${permission}. Reason: ${reason}`,
        errorCode: 'INVALID_PERMISSION',
        permission,
        reason,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class RoleNotFoundException extends HttpException {
  constructor(role: string) {
    super(
      {
        message: `Role not found: ${role}`,
        errorCode: 'ROLE_NOT_FOUND',
        role,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConfigurationException extends HttpException {
  constructor(errors: string[]) {
    super(
      {
        message: 'Configuration validation failed',
        errorCode: 'CONFIG_INVALID',
        errors,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(operation: string, error: Error) {
    super(
      {
        message: `Database operation failed: ${operation}`,
        errorCode: 'DATABASE_ERROR',
        operation,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class MigrationException extends HttpException {
  constructor(type: 'MIGRATION_FAILED' | 'SCHEMA_MISMATCH' | 'ROLLBACK_FAILED', details: string) {
    super(
      {
        message: `Migration error: ${details}`,
        errorCode: type,
        details,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class CacheException extends HttpException {
  constructor(operation: string, error: Error) {
    super(
      {
        message: `Cache operation failed: ${operation}`,
        errorCode: 'CACHE_ERROR',
        operation,
        error: error.message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ValidationException extends HttpException {
  constructor(field: string, reason: string) {
    super(
      {
        message: `Validation failed for field: ${field}`,
        errorCode: 'VALIDATION_ERROR',
        field,
        reason,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
