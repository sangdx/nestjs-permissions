import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { SecurityMiddleware } from '../middleware/security.middleware';
import { ConfigService } from '../services/config.service';

@Module({
  providers: [ConfigService],
  exports: [ConfigService]
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
} 