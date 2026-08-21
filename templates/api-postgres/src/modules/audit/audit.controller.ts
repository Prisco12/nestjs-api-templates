import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/permission-catalog';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Permissions(Permission.AUDIT_READ)
  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.audit.list(
      Math.max(1, page),
      Math.min(100, Math.max(1, limit)),
    );
  }
}
