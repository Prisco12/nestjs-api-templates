export const AuditAction = {
  AUTH_REGISTER: 'AUTH_REGISTER',
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_REFRESH: 'AUTH_REFRESH',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
} as const;

export interface AuditContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export interface CreateAuditLog extends AuditContext {
  actorId?: string;
  action: (typeof AuditAction)[keyof typeof AuditAction];
  resource: string;
  resourceId?: string;
  status: 'SUCCESS' | 'FAILURE';
  before?: object;
  after?: object;
}
