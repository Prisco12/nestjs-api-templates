import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';
import { CreateAuditLog } from './audit.types';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { createPaginatedResult } from '../../common/types/pagination';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLog>,
  ) {}

  record(input: CreateAuditLog) {
    return this.auditLogs.create(input);
  }

  async list(page: number, limit: number, filters: ListAuditLogsDto) {
    const query: Record<string, unknown> = {};
    for (const key of ['actorId', 'action', 'resource', 'resourceId', 'status'] as const) {
      if (filters[key]) query[key] = filters[key];
    }
    if (filters.from || filters.to) {
      query.createdAt = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(filters.to) } : {}),
      };
    }
    const [logs, totalItems] = await Promise.all([
      this.auditLogs
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditLogs.countDocuments(query),
    ]);
    return createPaginatedResult(
      logs.map((log) => ({
        id: log._id.toString(),
        actorId: log.actorId ?? null,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId ?? null,
        status: log.status,
        before: log.before ?? null,
        after: log.after ?? null,
        requestId: log.requestId ?? null,
        ip: log.ip ?? null,
        userAgent: log.userAgent ?? null,
        createdAt: log.createdAt,
      })),
      page,
      limit,
      totalItems,
    );
  }
}
