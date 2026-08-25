import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = {
    findByEmailForAuth: jest.fn(),
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
  const refreshTokens = {};
  const jwt = { signAsync: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue(undefined);
    rateLimit.assertLoginAllowed.mockResolvedValue(undefined);
    rateLimit.recordLoginFailure.mockResolvedValue(undefined);
    service = new AuthService(
      users as any,
      audit as any,
      rateLimit as any,
      refreshTokens as any,
      jwt as any,
      config as any,
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
});
