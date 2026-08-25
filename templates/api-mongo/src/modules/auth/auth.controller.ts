import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './domain/authenticated-user.interface';
import { AuditContext } from '../audit/audit.types';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
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
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(dto, this.context(request)).then((result) => {
      this.setRefreshCookie(response, result.refreshToken);
      return { accessToken: result.accessToken, user: result.user };
    });
  }
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth
      .refresh(this.refreshToken(request), this.context(request))
      .then((result) => {
        this.setRefreshCookie(response, result.refreshToken);
        return { accessToken: result.accessToken, user: result.user };
      });
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(
      this.refreshToken(request),
      user.id,
      this.context(request),
    );
    response.clearCookie('refresh_token', this.cookieOptions());
  }

  private context(request: Request): AuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  private refreshToken(request: Request) {
    const value = request.headers.cookie
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('refresh_token='))
      ?.slice('refresh_token='.length);
    if (!value) throw new UnauthorizedException('Refresh token is required');
    return decodeURIComponent(value);
  }

  private setRefreshCookie(response: Response, value: string) {
    response.cookie('refresh_token', value, this.cookieOptions());
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
      maxAge:
        this.config.getOrThrow<number>('JWT_REFRESH_TTL_DAYS') * 86_400_000,
    };
  }
}
