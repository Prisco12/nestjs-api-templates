import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { Request } from 'express';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        errorMessage: 'Too many requests. Please try again later.',
        storage: new ThrottlerStorageRedisService(
          config.getOrThrow<string>('REDIS_URL'),
        ),
        throttlers: [
          {
            name: 'default',
            ttl: config.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
            limit: config.getOrThrow<number>('RATE_LIMIT_MAX'),
          },
        ],
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers.set-cookie',
          ],
          censor: '[Redacted]',
        },
        customProps: (request) => ({
          requestId: (request as Request).requestId,
        }),
        transport: isProduction
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
      },
    }),
    HealthModule,
    AuthModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    AuditModule,
    RbacModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
