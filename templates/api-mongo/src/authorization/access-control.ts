export const Role = { ADMIN: 'admin', USER: 'user' } as const;

export const Permission = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  AUDIT_READ: 'audit:read',
} as const;

export type RoleCode = (typeof Role)[keyof typeof Role];
export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const RolePermissions: Record<RoleCode, PermissionCode[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.USER]: [],
};
