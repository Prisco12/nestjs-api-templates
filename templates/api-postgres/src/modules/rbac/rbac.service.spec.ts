import { ConflictException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  const prisma = {
    role: { create: jest.fn(), findUnique: jest.fn() },
  };
  const users = { incrementAuthorizationVersionByRoleId: jest.fn() };
  const audit = { record: jest.fn() };
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue(undefined);
    service = new RbacService(prisma as any, users as any, audit as any);
  });

  it('converte violação de unicidade em conflito de role', async () => {
    prisma.role.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.createRole('manager', undefined, 'admin-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('recusa alterar permissões de role inexistente', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.setRolePermissions('missing-role', ['users:read'], 'admin-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
