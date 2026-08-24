import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './domain/authenticated-user.interface';
import { AuditContext } from '../audit/audit.types';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ) {
    return this.auth.register(dto, this.context(request));
  }
  @Public()
  @Throttle({ default: { limit: 20, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ) {
    return this.auth.login(dto, this.context(request));
  }
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ) {
    return this.auth.refresh(dto.refreshToken, this.context(request));
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.auth.logout(
      dto.refreshToken,
      user.id,
      this.context(request),
    );
  }

  private context(request: Request): AuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
