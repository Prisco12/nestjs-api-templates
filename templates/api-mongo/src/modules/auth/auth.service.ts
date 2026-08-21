import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';
import { AuthenticatedUser } from './domain/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditContext } from '../audit/audit.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async register(input: RegisterDto, context: AuditContext) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmailForAuth(email))
      throw new ConflictException('Email already registered');
    const user = await this.users.create(
      email,
      await argon2.hash(input.password),
    );
    await this.audit.record({
      actorId: user._id.toString(),
      action: AuditAction.AUTH_REGISTER,
      resource: 'users',
      resourceId: user._id.toString(),
      status: 'SUCCESS',
      after: { email: user.email },
      ...context,
    });
    return { id: user._id.toString(), email: user.email };
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
    await this.refreshTokens.deleteMany({
      userId: user._id,
      expiresAt: { $lte: new Date() },
    });
    const tokens = await this.issueTokens(this.toAuthenticatedUser(user));
    await this.audit.record({
      actorId: user._id.toString(),
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      resource: 'auth',
      resourceId: user._id.toString(),
      status: 'SUCCESS',
      ...context,
    });
    return tokens;
  }
  async refresh(value: string, context: AuditContext) {
    const [tokenId, secret] = value.split('.');
    if (!tokenId || !secret)
      throw new UnauthorizedException('Invalid refresh token');
    const stored = await this.refreshTokens
      .findOne({ tokenId })
      .populate({ path: 'userId', populate: { path: 'roles' } })
      .exec();
    const user = (stored as any)?.userId;
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      !user ||
      !(await argon2.verify(stored.tokenHash, secret))
    )
      throw new UnauthorizedException('Invalid refresh token');
    stored.revokedAt = new Date();
    await stored.save();
    const tokens = await this.issueTokens(this.toAuthenticatedUser(user));
    await this.audit.record({
      actorId: user._id.toString(),
      action: AuditAction.AUTH_REFRESH,
      resource: 'auth',
      resourceId: user._id.toString(),
      status: 'SUCCESS',
      ...context,
    });
    return tokens;
  }
  async logout(value: string, actorId: string, context: AuditContext) {
    const [tokenId] = value.split('.');
    if (tokenId)
      await this.refreshTokens.updateOne(
        { tokenId, revokedAt: null },
        { revokedAt: new Date() },
      );
    await this.audit.record({
      actorId,
      action: AuditAction.AUTH_LOGOUT,
      resource: 'auth',
      resourceId: actorId,
      status: 'SUCCESS',
      ...context,
    });
  }
  private toAuthenticatedUser(user: any): AuthenticatedUser {
    const permissions = (user.roles ?? []).flatMap(
      (role: any) => role.permissions ?? [],
    ) as string[];
    return {
      id: user._id.toString(),
      email: user.email,
      permissions: [...new Set<string>(permissions)],
      authorizationVersion: user.authorizationVersion,
    };
  }
  private async issueTokens(user: AuthenticatedUser) {
    const accessToken = await this.jwt.signAsync(user);
    const tokenId = randomUUID();
    const secret = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() +
        this.config.getOrThrow<number>('JWT_REFRESH_TTL_DAYS') * 86_400_000,
    );
    await this.refreshTokens.create({
      tokenId,
      tokenHash: await argon2.hash(secret),
      expiresAt,
      userId: user.id,
    });
    return { accessToken, refreshToken: `${tokenId}.${secret}`, user };
  }
}
