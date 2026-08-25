import { ConflictException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  const roles = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const users = { incrementAuthorizationVersionByRole: jest.fn() };
  const audit = { record: jest.fn() };
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue(undefined);
    service = new RbacService(roles as any, users as any, audit as any);
  });

  it('converte violação de unicidade em conflito de role', async () => {
    roles.create.mockRejectedValue({ code: 11000 });

    await expect(service.createRole('manager', undefined, 'admin-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('recusa alterar permissões de role inexistente', async () => {
    roles.findOneAndUpdate.mockResolvedValue(null);

    await expect(
      service.setRolePermissions('missing-role', ['users:read'], 'admin-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
