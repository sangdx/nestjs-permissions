#!/usr/bin/env node
import { Command } from 'commander';
import { ConfigPublisherService } from '../src/services/config-publisher.service';
import { SecurityConfigPublisherService } from '../src/services/security-config-publisher.service';
import { MigrationGeneratorService } from '../src/services/migration-generator.service';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();
const configPublisher = new ConfigPublisherService();
const securityConfigPublisher = new SecurityConfigPublisherService();
const migrationGenerator = new MigrationGeneratorService();

program
  .name('nestjs-permissions')
  .description('CLI tool for managing NestJS Dynamic Permissions')
  .version('0.5.0');

program
  .command('init')
  .description('Initialize permissions configuration in a project')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-t, --template <template>', 'Configuration template to use', 'basic')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      console.log(`Initializing permissions configuration in ${projectPath}`);
      
      await configPublisher.publishConfigToProject(projectPath, options.template);
      console.log('Configuration initialized successfully');
    } catch (error) {
      console.error('Error initializing configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('publish-config')
  .description('Publish configuration template to project')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-t, --template <template>', 'Configuration template to use', 'basic')
  .option('-c, --customizations <json>', 'Custom configuration overrides (JSON string)')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      const customizations = options.customizations ? JSON.parse(options.customizations) : undefined;
      
      console.log(`Publishing configuration to ${projectPath}`);
      await configPublisher.publishConfigToProject(projectPath, options.template, customizations);
      console.log('Configuration published successfully');
    } catch (error) {
      console.error('Error publishing configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('generate-migration')
  .description('Generate a migration between two configurations')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-f, --from <version>', 'Source configuration version')
  .option('-t, --to <version>', 'Target configuration version')
  .option('-n, --name <name>', 'Migration name')
  .option('-d, --directory <directory>', 'Migration directory', 'migrations')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      const fromConfig = require(path.join(projectPath, `config/permissions.${options.from}.js`));
      const toConfig = require(path.join(projectPath, `config/permissions.${options.to}.js`));
      
      console.log('Generating migration...');
      const migrationPath = await migrationGenerator.generateMigration(fromConfig, toConfig, {
        name: options.name,
        directory: options.directory
      });
      
      console.log(`Migration generated successfully: ${migrationPath}`);
    } catch (error) {
      console.error('Error generating migration:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate-config')
  .description('Validate a configuration file')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-c, --config-path <path>', 'Path to configuration file', 'config/permissions.config.js')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      const configPath = path.join(projectPath, options.configPath);
      
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      
      const config = require(configPath);
      console.log('Validating configuration...');
      
      // Basic validation
      if (!config.database || !config.permissions || !config.security) {
        throw new Error('Invalid configuration structure');
      }
      
      console.log('Configuration is valid');
    } catch (error) {
      console.error('Error validating configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-templates')
  .description('List available configuration templates')
  .action(() => {
    try {
      const templates = configPublisher.getAvailableTemplates();
      console.log('Available templates:');
      templates.forEach(template => {
        console.log(`\n${template.name}`);
        console.log(`Description: ${template.description}`);
      });
    } catch (error) {
      console.error('Error listing templates:', error.message);
      process.exit(1);
    }
  });

program
  .command('publish-security-config')
  .description('Publish security configuration template to project')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-t, --template <template>', 'Security configuration template to use', 'basic')
  .option('-c, --customizations <json>', 'Custom security configuration overrides (JSON string)')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      const customizations = options.customizations ? JSON.parse(options.customizations) : undefined;
      
      console.log(`Publishing security configuration to ${projectPath}`);
      await securityConfigPublisher.publishSecurityConfigToProject(projectPath, options.template, customizations);
      console.log('Security configuration published successfully');
    } catch (error) {
      console.error('Error publishing security configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('update-security-config')
  .description('Update existing security configuration')
  .option('-p, --project-path <path>', 'Path to the project root', '.')
  .option('-c, --customizations <json>', 'Security configuration updates (JSON string)')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      const updates = JSON.parse(options.customizations);
      
      console.log(`Updating security configuration in ${projectPath}`);
      await securityConfigPublisher.updateProjectSecurityConfig(projectPath, updates);
      console.log('Security configuration updated successfully');
    } catch (error) {
      console.error('Error updating security configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-security-templates')
  .description('List available security configuration templates')
  .action(() => {
    try {
      const templates = securityConfigPublisher.getAvailableTemplates();
      console.log('Available security templates:');
      templates.forEach(template => {
        console.log(`\n${template.name}`);
        console.log(`Description: ${template.description}`);
      });
    } catch (error) {
      console.error('Error listing security templates:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv); 