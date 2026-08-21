import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    AuditModule,
    RbacModule,
    UsersModule,
  ],
})
export class AppModule {}
