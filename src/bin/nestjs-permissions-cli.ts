#!/usr/bin/env node

import { Command } from 'commander';
import { SecurityConfigPublisherService } from '../services/security-config-publisher.service';
import { ConfigPublisherService } from '../services/config-publisher.service';
import { MigrationGeneratorService } from '../services/migration-generator.service';
import { SchemaValidatorService } from '../services/schema-validator.service';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program.version('1.0.0').description('NestJS Permissions CLI');

program
  .command('init')
  .description('Initialize permissions configuration')
  .option('-t, --template <template>', 'Configuration template (basic, advanced)', 'basic')
  .action(async (options) => {
    const configPublisher = new ConfigPublisherService();
    await configPublisher.publishConfigToProject(process.cwd(), options.template);
    console.log('Configuration initialized successfully');
  });

program
  .command('publish-config')
  .description('Publish configuration to project')
  .option('-t, --template <template>', 'Configuration template (basic, advanced)', 'basic')
  .action(async (options) => {
    const configPublisher = new ConfigPublisherService();
    await configPublisher.publishConfigToProject(process.cwd(), options.template);
    console.log('Configuration published successfully');
  });

program
  .command('generate-migration')
  .description('Generate migration')
  .option('-n, --name <n>', 'Migration name')
  .option('-d, --dir <directory>', 'Migration directory', 'src/migrations')
  .action(async (options) => {
    try {
      // First ensure config directory exists
      const configDir = path.join(process.cwd(), 'config');
      if (!fs.existsSync(configDir)) {
        console.error('Config directory not found. Please run `init` command first.');
        process.exit(1);
      }
      // Validate config schema
      const validator = new SchemaValidatorService();
      const isValid = await validator.validateConfig(process.cwd());
      if (!isValid) {
        console.error('Configuration validation failed. Please check your configuration file.');
        process.exit(1);
      }

      const migrationGenerator = new MigrationGeneratorService();
      await migrationGenerator.generateMigration(options.name, options.dir);
      console.log('Migration generated successfully');
    } catch (error) {
      console.error('Failed to generate migration:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate-config')
  .description('Validate configuration schema')
  .action(async () => {
    const validator = new SchemaValidatorService();
    const isValid = await validator.validateConfig(process.cwd());
    if (isValid) {
      console.log('Configuration is valid');
    } else {
      console.error('Configuration validation failed');
      process.exit(1);
    }
  });

program
  .command('publish-security-config')
  .description('Publish security configuration')
  .option('-t, --template <template>', 'Security template (basic, strict, enterprise)', 'basic')
  .action(async (options) => {
    const securityPublisher = new SecurityConfigPublisherService();
    await securityPublisher.publishSecurityConfigToProject(process.cwd(), options.template);
    console.log('Security configuration published successfully');
  });

program
  .command('update-security-config')
  .description('Update security configuration')
  .action(async () => {
    const securityPublisher = new SecurityConfigPublisherService();
    await securityPublisher.updateProjectSecurityConfig(process.cwd(), {});
    console.log('Security configuration updated successfully');
  });

program
  .command('list-security-templates')
  .description('List available security templates')
  .action(() => {
    const securityPublisher = new SecurityConfigPublisherService();
    const templates = securityPublisher.getAvailableTemplates();
    console.log('Available security templates:');
    templates.forEach((template: { name: string; description: string }) => {
      console.log(`- ${template.name}: ${template.description}`);
    });
  });

program.parse(process.argv);
