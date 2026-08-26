import { ConflictException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { mockDependency } from '../../../test/support/mock-dependency';

describe('RbacService', () => {
  const roles = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const users = {
    incrementAuthorizationVersionByRole: jest.fn(),
    replaceRoles: jest.fn(),
    rolesForAudit: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue(undefined);
    service = new RbacService(
      mockDependency<ConstructorParameters<typeof RbacService>[0]>(roles),
      mockDependency<ConstructorParameters<typeof RbacService>[1]>(users),
      mockDependency<ConstructorParameters<typeof RbacService>[2]>(audit),
    );
  });

  it('converte violação de unicidade em conflito de role', async () => {
    roles.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.createRole('manager', undefined, 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra before e after ao criar uma role', async () => {
    roles.create.mockResolvedValue({
      _id: { toString: () => 'role-id' },
      name: 'manager',
      description: 'Gerencia a equipe',
    });

    await service.createRole('manager', 'Gerencia a equipe', 'admin-id');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { exists: false },
        after: { name: 'manager', description: 'Gerencia a equipe' },
      }),
    );
  });

  it('recusa alterar permissões de role inexistente', async () => {
    roles.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(
      service.setRolePermissions('missing-role', ['users:read'], 'admin-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra permissões anteriores e posteriores', async () => {
    roles.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        name: 'manager',
        permissions: ['users:read'],
      }),
    });
    roles.findOneAndUpdate.mockResolvedValue({
      _id: { toString: () => 'role-id' },
      name: 'manager',
      permissions: ['users:read', 'users:update'],
    });

    await service.setRolePermissions(
      'manager',
      ['users:read', 'users:update'],
      'admin-id',
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { name: 'manager', permissions: ['users:read'] },
        after: {
          name: 'manager',
          permissions: ['users:read', 'users:update'],
        },
      }),
    );
  });

  it('registra roles anteriores e posteriores do usuário', async () => {
    roles.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ _id: 'role-user', name: 'user' }]),
    });
    users.rolesForAudit.mockResolvedValue({ userId: 'user-id', roles: [] });
    users.replaceRoles.mockResolvedValue('user-id');

    await service.setUserRoles('user-id', ['user'], 'admin-id');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { userId: 'user-id', roles: [] },
        after: { userId: 'user-id', roles: ['user'] },
      }),
    );
  });
});
