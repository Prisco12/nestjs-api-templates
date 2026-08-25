import { ServiceUnavailableException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const roles = { findOne: jest.fn() };
  const users = { create: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(users as any, roles as any);
  });

  it('recusa criar usuário quando a role padrão ainda não foi semeada', async () => {
    roles.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.create('user@example.com', 'password-hash'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('atribui automaticamente a role user ao criar usuário', async () => {
    const role = { _id: 'role-user' };
    roles.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(role) });
    users.create.mockResolvedValue({ _id: 'user-id', email: 'user@example.com' });

    await service.create('user@example.com', 'password-hash');

    expect(users.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'password-hash',
      roles: ['role-user'],
    });
  });
});
