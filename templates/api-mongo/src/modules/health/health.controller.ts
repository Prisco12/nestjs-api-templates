import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  @ApiOperation({ summary: 'Liveness', description: 'Indica que o processo HTTP está ativo; não consulta o banco.' })
  @ApiOkResponse({ description: 'API ativa.' })
  @Get()
  liveness() {
    return { status: 'ok' };
  }
  @ApiOperation({ summary: 'Readiness', description: 'Indica que a API está apta a receber tráfego e conectada ao banco.' })
  @ApiOkResponse({ description: 'API e banco disponíveis.' })
  @ApiServiceUnavailableResponse({ description: 'Banco de dados indisponível.' })
  @Get('ready')
  readiness() {
    if (this.connection.readyState !== 1)
      throw new ServiceUnavailableException('Database unavailable');
    return { status: 'ok', database: 'up' };
  }
}
