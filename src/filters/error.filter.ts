import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalErrorFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          ...errorResponse,
          ...exceptionResponse
        };
      } else {
        errorResponse.message = exceptionResponse;
      }
    } else {
      errorResponse.message = exception.message;
      errorResponse.errorCode = 'INTERNAL_SERVER_ERROR';
      
      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = exception.stack;
      }
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - ${JSON.stringify(errorResponse)}`,
      exception.stack
    );

    response
      .status(status)
      .json(errorResponse);
  }
} 