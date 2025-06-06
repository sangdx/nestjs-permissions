import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalErrorFilter } from '../filters/error.filter';
import { ErrorInterceptor } from '../interceptors/error.interceptor';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorInterceptor,
    },
  ],
})
export class ErrorHandlingModule {} 