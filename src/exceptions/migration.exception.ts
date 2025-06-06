import { HttpException, HttpStatus } from '@nestjs/common';

export type MigrationExceptionType =
  | 'MIGRATION_FAILED'
  | 'SCHEMA_MISMATCH'
  | 'ROLLBACK_FAILED'
  | 'CONFIG_LOAD_ERROR';

export class MigrationException extends HttpException {
  constructor(
    public type: MigrationExceptionType,
    details: string,
  ) {
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
