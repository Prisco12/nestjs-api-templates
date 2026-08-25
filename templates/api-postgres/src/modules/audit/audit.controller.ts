import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permission } from '../authorization/permission-catalog';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Listar logs de auditoria', description: 'Exige a permissão audit:read. Aceita filtros combináveis e paginação.' })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'action', required: false, example: 'AUTH_LOGIN_SUCCESS' })
  @ApiQuery({ name: 'resource', required: false, example: 'auth' })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'FAILURE'] })
  @ApiQuery({ name: 'from', required: false, example: '2026-08-25T00:00:00.000Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-08-25T23:59:59.999Z' })
  @ApiOkResponse({ description: 'Logs encontrados.' })
  @ApiUnauthorizedResponse({ description: 'Access token ausente, inválido ou expirado.' })
  @ApiForbiddenResponse({ description: 'Permissão audit:read ausente.' })
  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query() filters: ListAuditLogsDto,
  ) {
    return this.audit.list(
      Math.max(1, page),
      Math.min(100, Math.max(1, limit)),
      filters,
    );
  }
}
