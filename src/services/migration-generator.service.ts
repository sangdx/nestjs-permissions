import { Injectable } from '@nestjs/common';
import { PermissionConfig } from '../interfaces/config.interface';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationException } from '../exceptions/migration.exception';

export interface MigrationOptions {
  directory?: string;
  name?: string;
}

export interface EntityFields {
  tableName: string;
  fields: Record<string, string>;
}

@Injectable()
export class MigrationGeneratorService {
  async generateMigration(name: string, directory = 'src/migrations'): Promise<void> {
    try {
      // Create migrations directory if it doesn't exist
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Load configuration
      const config = await this.loadConfig();

      // Generate migration content
      const migrationContent = this.generateMigrationContent(config, name);

      // Generate filename with timestamp
      const timestamp = new Date().getTime();
      const className = this.generateClassName(name);
      const filename = `${timestamp}-${className}.ts`;
      const filePath = path.join(directory, filename);

      // Write migration file
      fs.writeFileSync(filePath, migrationContent, 'utf8');

      console.log(`Migration generated successfully at: ${filePath}`);
    } catch (error) {
      throw new MigrationException('MIGRATION_FAILED', error.message);
    }
  }

  private async loadConfig(): Promise<PermissionConfig> {
    try {
      // Load config from permissions.config.ts
      const configPath = path.join(process.cwd(), 'config', 'permissions.config.ts');
      if (fs.existsSync(configPath)) {
        return require(configPath);
      }
      throw new Error('Configuration file not found: permissions.config.ts');
    } catch (error) {
      throw new MigrationException('CONFIG_LOAD_ERROR', `Failed to load config: ${error.message}`);
    }
  }

  private generateClassName(name: string): string {
    // Convert name to PascalCase
    return name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  private generateMigrationContent(config: PermissionConfig, name: string): string {
    const createTables = this.generateCreateTables(config);
    const indexes = this.generateIndexes(config);

    return `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${this.generateClassName(name)} implements MigrationInterface {
  name = '${Date.now()}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    ${createTables
      .split('\n')
      .map((line) => `await queryRunner.query(\`${line}\`);`)
      .join('\n    ')}

    ${indexes.map((index) => `await queryRunner.query(\`${index}\`);`).join('\n    ')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(\`DROP TABLE IF EXISTS "${config.database.entities.userPermissions.tableName}"\`);
    await queryRunner.query(\`DROP TABLE IF EXISTS "${config.database.entities.routerPermissions.tableName}"\`);
    await queryRunner.query(\`DROP TABLE IF EXISTS "${config.database.entities.permissions.tableName}"\`);
  }
}`;
  }

  generateCreateTables(config: PermissionConfig): string {
    const lines: string[] = [];
    const { database } = config;

    // Convert config fields to required string fields
    const permissionFields: Record<string, string> = {};
    const routerPermissionFields: Record<string, string> = {};
    const userPermissionFields: Record<string, string> = {};

    // Convert permission fields
    Object.entries(database.entities.permissions.fields).forEach(([key, value]) => {
      if (value) permissionFields[key] = value;
    });

    // Convert router permission fields
    Object.entries(database.entities.routerPermissions.fields).forEach(([key, value]) => {
      if (value) routerPermissionFields[key] = value;
    });

    // Convert user permission fields
    Object.entries(database.entities.userPermissions.fields).forEach(([key, value]) => {
      if (value) userPermissionFields[key] = value;
    });

    // Generate tables with converted fields
    lines.push(
      this.generateTableCreation(database.entities.permissions.tableName, permissionFields),
    );

    lines.push(
      this.generateTableCreation(
        database.entities.routerPermissions.tableName,
        routerPermissionFields,
      ),
    );

    lines.push(
      this.generateTableCreation(database.entities.userPermissions.tableName, userPermissionFields),
    );

    return lines.join('\n\n');
  }

  generateAlterTables(oldConfig: PermissionConfig, newConfig: PermissionConfig): string[] {
    const alterations: string[] = [];

    // Convert config fields to required string fields
    const convertToEntityFields = (config: PermissionConfig): Record<string, EntityFields> => {
      const result: Record<string, EntityFields> = {};

      Object.entries(config.database.entities).forEach(([key, entity]) => {
        const fields: Record<string, string> = {};
        Object.entries(entity.fields).forEach(([fieldKey, value]) => {
          if (value) fields[fieldKey] = value;
        });

        result[key] = {
          tableName: entity.tableName,
          fields,
        };
      });

      return result;
    };

    const oldEntities = convertToEntityFields(oldConfig);
    const newEntities = convertToEntityFields(newConfig);

    // Compare and generate alterations for each entity
    Object.keys(oldEntities).forEach((key) => {
      this.compareAndGenerateAlterations(oldEntities[key], newEntities[key], alterations);
    });

    return alterations;
  }

  private generateTableCreation(tableName: string, fields: Record<string, string>): string {
    const columns = Object.entries(fields)
      .map(([key, value]) => {
        let type = 'varchar';
        if (key === 'id') type = 'uuid';
        if (key.includes('At')) type = 'timestamp';
        if (key === 'isActive') type = 'boolean';
        if (key === 'level') type = 'integer';

        return `"${value}" ${type}`;
      })
      .join(',\n    ');

    return `CREATE TABLE "${tableName}" (
    ${columns}
);`;
  }

  private compareAndGenerateAlterations(
    oldEntity: EntityFields,
    newEntity: EntityFields,
    alterations: string[],
  ): void {
    // Handle table rename
    if (oldEntity.tableName !== newEntity.tableName) {
      alterations.push(`ALTER TABLE "${oldEntity.tableName}" RENAME TO "${newEntity.tableName}";`);
    }

    // Handle column changes
    const oldFields = new Set(Object.values(oldEntity.fields));
    const newFields = new Set(Object.values(newEntity.fields));

    // Added columns
    for (const [key, value] of Object.entries(newEntity.fields)) {
      if (!oldFields.has(value)) {
        let type = 'varchar';
        if (key === 'id') type = 'uuid';
        if (key.includes('At')) type = 'timestamp';
        if (key === 'isActive') type = 'boolean';
        if (key === 'level') type = 'integer';

        alterations.push(`ALTER TABLE "${newEntity.tableName}" ADD COLUMN "${value}" ${type};`);
      }
    }

    // Removed columns
    for (const value of oldFields) {
      if (!newFields.has(value)) {
        alterations.push(`ALTER TABLE "${newEntity.tableName}" DROP COLUMN "${value}";`);
      }
    }
  }

  generateIndexes(config: PermissionConfig): string[] {
    const indexes: string[] = [];
    const { database } = config;

    // Add indexes for permissions table
    const permissionNameField = database.entities.permissions.fields.name;
    if (permissionNameField) {
      indexes.push(
        `CREATE INDEX "IDX_${database.entities.permissions.tableName}_name" ON "${database.entities.permissions.tableName}" ("${permissionNameField}");`,
      );
    }

    // Add indexes for router permissions table
    const routeField = database.entities.routerPermissions.fields.route;
    if (routeField) {
      indexes.push(
        `CREATE INDEX "IDX_${database.entities.routerPermissions.tableName}_route" ON "${database.entities.routerPermissions.tableName}" ("${routeField}");`,
      );
    }

    // Add indexes for user permissions table
    const userIdField = database.entities.userPermissions.fields.userId;
    if (userIdField) {
      indexes.push(
        `CREATE INDEX "IDX_${database.entities.userPermissions.tableName}_user" ON "${database.entities.userPermissions.tableName}" ("${userIdField}");`,
      );
    }

    return indexes;
  }

  private generateDownMigration(
    oldConfig: PermissionConfig,
    alterations: string[],
    indexes: string[],
  ): string {
    const downStatements: string[] = [];

    // Revert indexes
    indexes.forEach((index) => {
      const match = index.match(/CREATE INDEX "([^"]+)"/);
      if (match) {
        downStatements.push(`DROP INDEX "${match[1]}";`);
      }
    });

    // Revert alterations in reverse order
    alterations.reverse().forEach((alter) => {
      if (alter.includes('ADD COLUMN')) {
        const match = alter.match(/ADD COLUMN "([^"]+)"/);
        if (match) {
          downStatements.push(
            `ALTER TABLE "${oldConfig.database.entities.permissions.tableName}" DROP COLUMN "${match[1]}";`,
          );
        }
      } else if (alter.includes('DROP COLUMN')) {
        // We can't restore dropped columns without knowing their types
        downStatements.push('-- Cannot automatically restore dropped columns');
      } else if (alter.includes('RENAME TO')) {
        const match = alter.match(/RENAME TO "([^"]+)"/);
        if (match) {
          downStatements.push(
            `ALTER TABLE "${match[1]}" RENAME TO "${oldConfig.database.entities.permissions.tableName}";`,
          );
        }
      }
    });

    return downStatements.map((stmt) => `await queryRunner.query(\`${stmt}\`);`).join('\n    ');
  }
}
