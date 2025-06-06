import { HttpException, HttpStatus } from '@nestjs/common';

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
