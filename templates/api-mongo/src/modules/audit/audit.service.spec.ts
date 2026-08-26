import { AuditService } from './audit.service';
import { mockDependency } from '../../../test/support/mock-dependency';

describe('AuditService', () => {
  const auditLogs = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(
      mockDependency<ConstructorParameters<typeof AuditService>[0]>(auditLogs),
    );
  });

  it('retorna logs normalizados com paginação e filtros', async () => {
    const lean = jest.fn().mockResolvedValue([
      {
        _id: { toString: () => 'log-id' },
        actorId: 'admin-id',
        action: 'RBAC_ROLE_CREATED',
        resource: 'roles',
        status: 'SUCCESS',
        before: { exists: false },
        after: { name: 'manager' },
        createdAt: new Date('2026-08-25T12:00:00.000Z'),
      },
    ]);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    auditLogs.find.mockReturnValue({ sort });
    auditLogs.countDocuments.mockResolvedValue(7);

    const result = await service.list(2, 3, { status: 'SUCCESS' });

    expect(auditLogs.find).toHaveBeenCalledWith({ status: 'SUCCESS' });
    expect(result).toMatchObject({
      data: [
        {
          id: 'log-id',
          before: { exists: false },
          after: { name: 'manager' },
        },
      ],
      pagination: {
        page: 2,
        limit: 3,
        totalItems: 7,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });
});
