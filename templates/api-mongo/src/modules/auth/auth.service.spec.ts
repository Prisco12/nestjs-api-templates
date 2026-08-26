import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { mockDependency } from '../../../test/support/mock-dependency';

describe('AuthService', () => {
  const users = {
    findByEmailForAuth: jest.fn(),
    findAccountTokenUser: jest.fn(),
    confirmEmail: jest.fn(),
    setEmailVerificationToken: jest.fn(),
    setPasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    create: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const rateLimit = {
    assertLoginAllowed: jest.fn(),
    recordLoginFailure: jest.fn(),
    clearLoginFailures: jest.fn(),
    reserveRegistration: jest.fn(),
    releaseRegistration: jest.fn(),
  };
  const refreshTokens = { deleteMany: jest.fn() };
  const email = {
    sendVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue(undefined);
    rateLimit.assertLoginAllowed.mockResolvedValue(undefined);
    rateLimit.recordLoginFailure.mockResolvedValue(undefined);
    email.sendVerification.mockResolvedValue(undefined);
    email.sendPasswordReset.mockResolvedValue(undefined);
    service = new AuthService(
      mockDependency<ConstructorParameters<typeof AuthService>[0]>(users),
      mockDependency<ConstructorParameters<typeof AuthService>[1]>(audit),
      mockDependency<ConstructorParameters<typeof AuthService>[2]>(rateLimit),
      mockDependency<ConstructorParameters<typeof AuthService>[3]>(email),
      mockDependency<ConstructorParameters<typeof AuthService>[4]>(
        refreshTokens,
      ),
      mockDependency<ConstructorParameters<typeof AuthService>[5]>(jwt),
      mockDependency<ConstructorParameters<typeof AuthService>[6]>(config),
    );
  });

  it('recusa cadastro com e-mail já utilizado', async () => {
    users.findByEmailForAuth.mockResolvedValue({ _id: 'existing-user' });

    await expect(
      service.register(
        { email: 'USER@example.com', password: 'SenhaSegura123!' },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rateLimit.reserveRegistration).not.toHaveBeenCalled();
  });

  it('registra falha e recusa login inválido', async () => {
    users.findByEmailForAuth.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'USER@example.com', password: 'senha-incorreta' },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rateLimit.recordLoginFailure).toHaveBeenCalledWith(
      'user@example.com',
      '127.0.0.1',
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILURE' }),
    );
  });

  it('recusa login com credenciais válidas antes da confirmação do e-mail', async () => {
    users.findByEmailForAuth.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      email: 'user@example.com',
      isActive: true,
      emailVerifiedAt: null,
      passwordHash: await argon2.hash('SenhaSegura123!'),
    });

    await expect(
      service.login(
        { email: 'user@example.com', password: 'SenhaSegura123!' },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirma e-mail com token válido', async () => {
    const secret = 'valid-secret-with-at-least-twenty-characters';
    users.findAccountTokenUser.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      emailVerifiedAt: null,
      emailVerificationTokenHash: await argon2.hash(secret),
      emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    await service.verifyEmail(`user-id.${secret}`, { requestId: 'request-id' });

    expect(users.confirmEmail).toHaveBeenCalledWith('user-id');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTH_EMAIL_VERIFIED' }),
    );
  });

  it('recusa token de confirmação expirado', async () => {
    const secret = 'expired-secret-with-at-least-twenty-characters';
    users.findAccountTokenUser.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      emailVerifiedAt: null,
      emailVerificationTokenHash: await argon2.hash(secret),
      emailVerificationTokenExpiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      service.verifyEmail(`user-id.${secret}`, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não permite reutilizar token de confirmação consumido', async () => {
    const secret = 'single-use-secret-with-at-least-twenty-characters';
    users.findAccountTokenUser
      .mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        emailVerifiedAt: null,
        emailVerificationTokenHash: await argon2.hash(secret),
        emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        _id: { toString: () => 'user-id' },
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      });

    await service.verifyEmail(`user-id.${secret}`, {});
    await expect(
      service.verifyEmail(`user-id.${secret}`, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invalida o token anterior ao reenviar a confirmação', async () => {
    const oldSecret = 'old-secret-with-at-least-twenty-characters';
    let replacementHash = '';
    users.findByEmailForAuth.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      email: 'user@example.com',
      isActive: true,
      emailVerifiedAt: null,
    });
    users.setEmailVerificationToken.mockImplementation(
      (_id: string, hash: string) => {
        replacementHash = hash;
      },
    );

    await service.resendVerification('user@example.com', {});
    users.findAccountTokenUser.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      emailVerifiedAt: null,
      emailVerificationTokenHash: replacementHash,
      emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.verifyEmail(`user-id.${oldSecret}`, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não revela a existência da conta quando o SMTP está indisponível', async () => {
    users.findByEmailForAuth.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      email: 'user@example.com',
      isActive: true,
      emailVerifiedAt: new Date(),
    });
    email.sendPasswordReset.mockRejectedValue(new Error('SMTP unavailable'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(
      service.forgotPassword('user@example.com', {}),
    ).resolves.toBeUndefined();
  });
});
