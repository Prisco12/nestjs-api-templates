import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';
import { CreateAuditLog } from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLog>,
  ) {}

  record(input: CreateAuditLog) {
    return this.auditLogs.create(input);
  }

  list(page: number, limit: number) {
    return this.auditLogs
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
}
