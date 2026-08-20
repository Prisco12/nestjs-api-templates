import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAuditLog } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: CreateAuditLog) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        status: input.status,
        beforeData: input.before,
        afterData: input.after,
        requestId: input.requestId,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  }

  list(page: number, limit: number) {
    return this.prisma.auditLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
