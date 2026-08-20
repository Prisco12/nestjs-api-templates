import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from './domain/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditContext } from '../audit/audit.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto, context: AuditContext) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmailForAuth(email))
      throw new ConflictException('Email already registered');
    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.create(email, passwordHash);
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.AUTH_REGISTER,
      resource: 'users',
      resourceId: user.id,
      status: 'SUCCESS',
      after: { email: user.email },
      ...context,
    });
    return { id: user.id, email: user.email };
  }

  async login(input: LoginDto, context: AuditContext) {
    const user = await this.users.findByEmailForAuth(
      input.email.trim().toLowerCase(),
    );
    if (
      !user ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, input.password))
    ) {
      await this.audit.record({
        action: AuditAction.AUTH_LOGIN_FAILED,
        resource: 'auth',
        status: 'FAILURE',
        after: { email: input.email.trim().toLowerCase() },
        ...context,
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.deleteExpiredTokensForUser(user.id);
    const tokens = await this.issueTokens(this.toAuthenticatedUser(user));
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      resource: 'auth',
      resourceId: user.id,
      status: 'SUCCESS',
      ...context,
    });
    return tokens;
  }

  async refresh(refreshToken: string, context: AuditContext) {
    const [tokenId, secret] = refreshToken.split('.');
    if (!tokenId || !secret)
      throw new UnauthorizedException('Invalid refresh token');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: { permissions: { include: { permission: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      !(await argon2.verify(stored.tokenHash, secret))
    )
      throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(
      this.toAuthenticatedUser(stored.user),
    );
    await this.audit.record({
      actorId: stored.user.id,
      action: AuditAction.AUTH_REFRESH,
      resource: 'auth',
      resourceId: stored.user.id,
      status: 'SUCCESS',
      ...context,
    });
    return tokens;
  }

  async logout(refreshToken: string, actorId: string, context: AuditContext) {
    const [tokenId] = refreshToken.split('.');
    if (tokenId)
      await this.prisma.refreshToken.updateMany({
        where: { id: tokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await this.audit.record({
      actorId,
      action: AuditAction.AUTH_LOGOUT,
      resource: 'auth',
      resourceId: actorId,
      status: 'SUCCESS',
      ...context,
    });
  }

  async deleteExpiredTokens() {
    return this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  private async deleteExpiredTokensForUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lte: new Date() } },
    });
  }

  private toAuthenticatedUser(user: any): AuthenticatedUser {
    const permissions = (user.roles as any[]).flatMap((role: any) =>
      role.role.permissions.map(
        (assignment: any) => assignment.permission.code,
      ),
    ) as string[];
    return {
      id: user.id,
      email: user.email,
      permissions: [...new Set<string>(permissions)],
    };
  }

  private async issueTokens(user: AuthenticatedUser) {
    const accessToken = await this.jwt.signAsync(user);
    const id = randomUUID();
    const secret = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() +
        this.config.getOrThrow<number>('JWT_REFRESH_TTL_DAYS') * 86_400_000,
    );
    await this.prisma.refreshToken.create({
      data: {
        id,
        tokenHash: await argon2.hash(secret),
        expiresAt,
        userId: user.id,
      },
    });
    return { accessToken, refreshToken: `${id}.${secret}`, user };
  }
}
