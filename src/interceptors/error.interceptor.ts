import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatabaseException, CacheException } from '../exceptions/permission.exceptions';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        // Transform database errors
        if (error.name === 'QueryFailedError' || error.name === 'EntityNotFoundError') {
          this.logger.error(
            `Database error: ${error.message}`,
            error.stack
          );
          return throwError(() => new DatabaseException('query', error));
        }

        // Transform cache errors
        if (error.name === 'CacheError') {
          this.logger.error(
            `Cache error: ${error.message}`,
            error.stack
          );
          return throwError(() => new CacheException('operation', error));
        }

        // Log any other errors
        this.logger.error(
          `Unhandled error: ${error.message}`,
          error.stack
        );
        return throwError(() => error);
      })
    );
  }
} 