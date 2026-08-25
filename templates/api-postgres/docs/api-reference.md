# Referência da API

Prefixo: `/api/v1`. Respostas de sucesso usam `success`, `data` e `meta`.

## Públicos

- `GET /health`
- `GET /health/ready`
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/login`
- `POST /auth/refresh`

## Autenticados

- `POST /auth/logout`
- `GET /users/me`

## Administrativos

- `GET /users` (`users:read`)
- `GET /audit-logs` (`audit:read`)
- `GET /rbac/permissions`, `GET /rbac/roles`, `POST /rbac/roles`, `PUT /rbac/roles/:name/permissions`, `PUT /rbac/users/:userId/roles` (`roles:manage`)

Importe a coleção em `postman/api-postgres.postman_collection.json` para exemplos de payloads.

## Exemplos

`POST /auth/login`:

```json
{ "email": "admin@example.com", "password": "ChangeMe123!" }
```

`POST /auth/refresh` não recebe body; o refresh token é lido do cookie HttpOnly.

`PUT /rbac/roles/manager/permissions`:

```json
{ "permissions": ["users:read"] }
```

Erros seguem `{ "success": false, "error": { "code", "message" }, "meta": { "requestId", "timestamp", "path" } }`. Os principais códigos são `VALIDATION_ERROR`/`BAD_REQUEST` (payload inválido), `UNAUTHORIZED` (token ausente, expirado ou desatualizado), `FORBIDDEN` (permissão ausente), `NOT_FOUND` e `CONFLICT`.

## Fluxos

`login → access JWT + refresh token → rota protegida → guard valida assinatura e authorizationVersion`.

`alteração de role/permissão → authorizationVersion incrementada → JWT anterior retorna 401 → refresh/login emite JWT novo`.

`ação RBAC → AuditLog com executor, recurso e resultado`.
