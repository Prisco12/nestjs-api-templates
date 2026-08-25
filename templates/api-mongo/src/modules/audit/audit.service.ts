import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';
import { CreateAuditLog } from './audit.types';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLog>,
  ) {}

  record(input: CreateAuditLog) {
    return this.auditLogs.create(input);
  }

  list(page: number, limit: number, filters: ListAuditLogsDto) {
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
    return this.auditLogs
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
}
