import { Injectable } from '@nestjs/common';
import { Permission } from '../interfaces/permission.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../models/permission.entity';
import { RoleHierarchyException } from '../exceptions/role-hierarchy.exception';
import 'reflect-metadata';
import { ConfigService } from './config.service';

export interface RoleNode {
  role: string;
  level: number;
  children: RoleNode[];
  permissions: Set<string>;
}

export interface RoleHierarchy {
  [role: string]: {
    level: number;
    inherits?: string[];
  };
}

@Injectable()
export class RoleHierarchyService {
  private roleTree: RoleNode | null = null;
  private rolePermissions: Map<string, Set<string>> = new Map();

  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    private readonly configService: ConfigService,
  ) {}

  async buildRoleTree(hierarchy: RoleHierarchy): Promise<RoleNode> {
    // Find root roles (those with no parents)
    const roles = Object.keys(hierarchy);
    const childRoles = new Set(roles.flatMap((role) => hierarchy[role].inherits || []));
    const rootRoles = roles.filter((role) => !childRoles.has(role));

    // Build tree starting from root roles
    this.roleTree = await this.buildRoleNode(rootRoles[0], hierarchy);
    return this.roleTree;
  }

  private async buildRoleNode(role: string, hierarchy: RoleHierarchy): Promise<RoleNode> {
    const { level, inherits = [] } = hierarchy[role];
    const children: RoleNode[] = [];

    // Recursively build child nodes
    for (const childRole of inherits) {
      const childNode = await this.buildRoleNode(childRole, hierarchy);
      children.push(childNode);
    }

    // Get permissions for this role
    const permissions = await this.getRolePermissions(role);

    return {
      role,
      level,
      children,
      permissions: new Set(permissions.map((p) => String(p.id))),
    };
  }

  async getInheritedPermissions(role: string): Promise<Permission[]> {
    if (!this.roleTree) {
      throw new Error('Role hierarchy not initialized');
    }

    // Find the role node
    const roleNode = this.findRoleNode(this.roleTree, role);
    if (!roleNode) {
      throw new Error(`Role not found: ${role}`);
    }

    // Get all permissions including inherited ones
    const permissionIds = new Set<string>();
    this.collectPermissions(roleNode, permissionIds);

    // Fetch actual permission objects and ensure they match the Permission interface
    const permissions = await this.permissionRepository.findByIds([...permissionIds]);
    return permissions.map(this.mapPermissionEntity);
  }

  private findRoleNode(node: RoleNode, role: string): RoleNode | null {
    if (node.role === role) {
      return node;
    }

    for (const child of node.children) {
      const found = this.findRoleNode(child, role);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private collectPermissions(node: RoleNode, collected: Set<string>): void {
    // Add this node's permissions
    node.permissions.forEach((p) => collected.add(p));

    // Add children's permissions
    for (const child of node.children) {
      this.collectPermissions(child, collected);
    }
  }

  private async getRolePermissions(role: string): Promise<Permission[]> {
    // Check cache
    const cachedPermissions = this.rolePermissions.get(role);
    if (cachedPermissions) {
      const permissions = await this.permissionRepository.findByIds([...cachedPermissions]);
      return permissions.map(this.mapPermissionEntity);
    }

    // Fetch permissions from database
    const permissions = await this.permissionRepository.find({
      where: { name: role, is_active: true },
    });

    // Cache the results
    this.rolePermissions.set(role, new Set(permissions.map((p) => String(p.id))));

    return permissions.map(this.mapPermissionEntity);
  }

  validateRoleHierarchy(hierarchy: RoleHierarchy): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Check for cycles using DFS
    const hasCycle = (currentRole: string): boolean => {
      if (recursionStack.has(currentRole)) {
        return true; // Cycle detected
      }

      if (visited.has(currentRole)) {
        return false; // Already checked this branch
      }

      visited.add(currentRole);
      recursionStack.add(currentRole);

      const inherits = hierarchy[currentRole]?.inherits || [];
      for (const child of inherits) {
        if (hasCycle(child)) {
          return true;
        }
      }

      recursionStack.delete(currentRole);
      return false;
    };

    // Check each role
    for (const role of Object.keys(hierarchy)) {
      if (hasCycle(role)) {
        return false;
      }
    }

    // Validate levels
    for (const [parentRole, config] of Object.entries(hierarchy)) {
      const inherits = config.inherits || [];
      for (const childRole of inherits) {
        if (!hierarchy[childRole]) {
          return false; // Child role doesn't exist
        }
        if (hierarchy[childRole].level >= config.level) {
          throw new RoleHierarchyException(
            `Invalid role hierarchy: Child role '${childRole}' has higher or equal level than parent role '${parentRole}'`,
          );
        }
      }
    }

    return true;
  }

  private validateHierarchy(hierarchy: RoleHierarchy): void {
    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const checkCircular = (currentRole: string): void => {
      visited.add(currentRole);
      recursionStack.add(currentRole);

      const inherits = hierarchy[currentRole]?.inherits || [];
      for (const inheritedRole of inherits) {
        if (!visited.has(inheritedRole)) {
          checkCircular(inheritedRole);
        } else if (recursionStack.has(inheritedRole)) {
          throw new RoleHierarchyException(
            `Circular dependency detected in role hierarchy: ${currentRole} -> ${inheritedRole}`,
          );
        }
      }

      recursionStack.delete(currentRole);
    };

    Object.keys(hierarchy).forEach(checkCircular);
  }

  clearCache(): void {
    this.rolePermissions.clear();
    this.roleTree = null;
  }

  async getPermissionsByRole(role: string): Promise<PermissionEntity[]> {
    return this.permissionRepository
      .createQueryBuilder('p')
      .where('p.name = :role AND p.is_active = :isActive', { role, isActive: true })
      .getMany();
  }

  async getRoleHierarchy(role: string): Promise<PermissionEntity[]> {
    const permissions = await this.permissionRepository
      .createQueryBuilder('p')
      .where('p.name = :role AND p.is_active = :isActive', { role, isActive: true })
      .getMany();

    return permissions;
  }

  private mapPermissionEntity(permission: PermissionEntity): Permission {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      level: permission.level,
      is_active: permission.is_active,
      created_at: permission.created_at,
      updated_at: permission.updated_at,
    };
  }
}
