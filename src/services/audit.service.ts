import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from './config.service';
import { AuditLogEntity, AuditAction } from '../models/audit-log.entity';

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  target: string;
  result: boolean;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface AuditFilters {
  userId?: string;
  action?: AuditAction;
  target?: string;
  result?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
    private readonly configService: ConfigService,
  ) {}

  async logPermissionCheck(
    userId: string,
    route: string,
    result: boolean,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (!this.configService.getConfig().security.enableAuditLog) {
      return;
    }

    await this.createAuditLog({
      userId,
      action: 'check',
      target: route,
      result,
      metadata,
    });
  }

  async logPermissionChange(
    userId: string,
    permission: string,
    action: 'grant' | 'revoke',
    targetUserId: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (!this.configService.getConfig().security.enableAuditLog) {
      return;
    }

    await this.createAuditLog({
      userId,
      action,
      target: permission,
      result: true,
      metadata: {
        ...metadata,
        targetUserId,
      },
    });
  }

  async logPermissionModification(
    userId: string,
    permission: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (!this.configService.getConfig().security.enableAuditLog) {
      return;
    }

    await this.createAuditLog({
      userId,
      action: 'modify',
      target: permission,
      result: true,
      metadata,
    });
  }

  async getAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
    const { userId, action, target, result, startDate, endDate, limit = 100, offset = 0 } = filters;

    const query = this.auditRepository.createQueryBuilder('audit');

    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }

    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    if (target) {
      query.andWhere('audit.target = :target', { target });
    }

    if (result !== undefined) {
      query.andWhere('audit.result = :result', { result });
    }

    if (startDate && endDate) {
      query.andWhere({
        timestamp: Between(startDate, endDate),
      });
    } else if (startDate) {
      query.andWhere({
        timestamp: MoreThanOrEqual(startDate),
      });
    } else if (endDate) {
      query.andWhere({
        timestamp: LessThanOrEqual(endDate),
      });
    }

    query.orderBy('audit.timestamp', 'DESC').skip(offset).take(limit);

    return query.getMany();
  }

  private async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await this.auditRepository.save({
      ...log,
      timestamp: new Date(),
    });
  }
}
