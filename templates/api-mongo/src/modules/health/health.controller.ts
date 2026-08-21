import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  @Get() liveness() {
    return { status: 'ok' };
  }
  @Get('ready') readiness() {
    if (this.connection.readyState !== 1)
      throw new ServiceUnavailableException('Database unavailable');
    return { status: 'ok', database: 'up' };
  }
}
