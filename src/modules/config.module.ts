import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '../services/config.service';
import { PermissionConfig } from '../interfaces/config.interface';

@Module({})
export class ConfigModule {
  static register(config?: Partial<PermissionConfig>): DynamicModule {
    const providers = [
      {
        provide: ConfigService,
        useFactory: async () => {
          const service = new ConfigService();
          if (config) {
            await service.loadConfig();
            const currentConfig = service.getConfig();
            return service.mergeWithDefaults({ ...currentConfig, ...config });
          }
          return service;
        },
      },
    ];

    return {
      module: ConfigModule,
      providers,
      exports: [ConfigService],
      global: true,
    };
  }
}
