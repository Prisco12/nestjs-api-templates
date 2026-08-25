# Referência técnica dos templates NestJS

Este documento descreve os dois templates: `templates/api-postgres` (PostgreSQL + Prisma) e `templates/api-mongo` (MongoDB + Mongoose). Ambos expõem API REST versionada no prefixo `/api/v1`.

## Contrato comum de resposta

Sucesso:

```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "uuid" }
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden resource"
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-08-24T12:00:00.000Z",
    "path": "/api/v1/users"
  }
}
```

## Rate limiting

Os dois templates usam `@nestjs/throttler` com armazenamento Redis compartilhado por IP. O limite global vem de `RATE_LIMIT_MAX` e `RATE_LIMIT_TTL_MS` (padrão: 100 requisições por minuto). As rotas públicas de autenticação possuem limites próprios mais restritivos. Ao exceder um limite, a resposta é `429 Too Many Requests` no formato padrão de erro. O bloqueio gradual de login e as reservas de cadastro também usam Redis, portanto funcionam de forma consistente com múltiplas instâncias da API.

## Banco de dados

### Relacionamentos

```text
User 1 ── N RefreshToken
User N ── N Role, via UserRole (PostgreSQL) ou User.roles (MongoDB)
Role N ── N Permission, via RolePermission (PostgreSQL) ou Role.permissions (MongoDB)
AuditLog registra ações; actorId referencia logicamente User
```

### PostgreSQL

| Tabela | Colunas e restrições | Relacionamentos | Exemplo |
|---|---|---|---|
| `User` | `id UUID PK`, `email varchar(320) UNIQUE`, `passwordHash`, `emailVerifiedAt nullable`, hashes/expirações temporários de confirmação e reset, `isActive boolean default true`, `authorizationVersion int default 1`, timestamps | N:N com Role; 1:N RefreshToken | `{ "id":"0f…", "email":"admin@example.com", "emailVerifiedAt":"2026-08-25T12:00:00.000Z" }` |
| `Role` | `id UUID PK`, `name varchar(100) UNIQUE`, `description nullable` | N:N User e Permission | `{ "name":"admin", "description":"Template administrator" }` |
| `Permission` | `id UUID PK`, `code varchar(150) UNIQUE`, `description nullable` | N:N Role | `{ "code":"users:read" }` |
| `UserRole` | `userId UUID`, `roleId UUID`, PK composta | liga User e Role; cascade delete | `{ "userId":"0f…", "roleId":"1a…" }` |
| `RolePermission` | `roleId UUID`, `permissionId UUID`, PK composta | liga Role e Permission; cascade delete | `{ "roleId":"1a…", "permissionId":"2b…" }` |
| `RefreshToken` | `id UUID PK`, `tokenHash`, `expiresAt`, `revokedAt nullable`, `userId`, `createdAt`; índice `userId, expiresAt` | pertence a User | `{ "id":"…", "expiresAt":"2026-09-01T00:00:00Z", "revokedAt":null }` |
| `AuditLog` | `id UUID PK`, `actorId nullable`, `action`, `resource`, `resourceId nullable`, `status`, `beforeData/afterData JSON nullable`, contexto e data | referência lógica ao executor | `{ "action":"RBAC_ROLE_CREATED", "resource":"roles", "status":"SUCCESS" }` |

### MongoDB

| Coleção | Campos e restrições | Relacionamentos | Exemplo |
|---|---|---|---|
| `users` | `_id ObjectId`, `email unique`, `passwordHash`, `emailVerifiedAt`, hashes/expirações temporários de confirmação e reset, `isActive`, `authorizationVersion`, `roles ObjectId[]`, timestamps | roles referenciam `roles` | `{ "email":"admin@example.com", "emailVerifiedAt":"2026-08-25T12:00:00.000Z", "roles":["66…"] }` |
| `roles` | `_id ObjectId`, `name unique`, `description opcional`, `permissions string[]`, timestamps | usada por users | `{ "name":"manager", "permissions":["users:read"] }` |
| `refreshtokens` | `tokenId unique`, `tokenHash`, `expiresAt TTL`, `revokedAt opcional`, `userId ObjectId indexado`, timestamps | pertence a user | `{ "tokenId":"uuid", "userId":"66…", "revokedAt":null }` |
| `auditlogs` | `actorId`, `action indexado`, `resource`, `resourceId`, `status`, `before`, `after`, contexto, `createdAt` | referência lógica ao executor | `{ "action":"AUTH_LOGIN_SUCCESS", "resource":"auth", "status":"SUCCESS" }` |

## Endpoints

Autenticação Bearer usa `Authorization: Bearer <accessToken>`. Endpoints RBAC exigem `roles:manage`; auditoria exige `audit:read`; listagem de usuários exige `users:read`.

| Método e rota | Auth | Descrição e parâmetros |
|---|---|---|
| `GET /health` | pública | Liveness; responde `{status:"ok"}`. |
| `GET /health/ready` | pública | Readiness; consulta o banco. Retorna 503 se indisponível. |
| `POST /auth/register` | pública | Body obrigatório: `email` e senha forte com pelo menos 12 caracteres. Cria usuário com role `user` e envia confirmação. |
| `POST /auth/verify-email` | pública | Body: `token`. Confirma o e-mail com token de uso único válido por 24 horas. |
| `POST /auth/resend-verification` | pública | Body: `email`. Invalida o token anterior e envia outro; sempre responde 204. |
| `POST /auth/forgot-password` | pública | Body: `email`. Envia token de redefinição válido por uma hora; sempre responde 204. |
| `POST /auth/reset-password` | pública | Body: `token`, `password`. Troca a senha e revoga todas as sessões. |
| `POST /auth/login` | pública | Body: `email`, `password`. Retorna access token e usuário; refresh token segue no cookie HttpOnly. |
| `POST /auth/refresh` | cookie | Lê e rotaciona `refresh_token` do cookie HttpOnly; não recebe body. |
| `POST /auth/logout` | Bearer + cookie | Revoga a sessão e remove o cookie; responde 204. |
| `GET /users/me` | Bearer | Retorna perfil do usuário autenticado. |
| `GET /users?page=1&limit=20` | `users:read` | Paginação; `page` e `limit` são inteiros, limit máximo 100. |
| `GET /audit-logs?page=1&limit=20` | `audit:read` | Lista auditorias por data decrescente. |
| `GET /rbac/permissions` | `roles:manage` | Lista permissões suportadas pelo catálogo. |
| `GET /rbac/roles` | `roles:manage` | Lista roles e permissões. |
| `POST /rbac/roles` | `roles:manage` | Body: `name` obrigatório (`^[a-z][a-z0-9_-]*$`, 2–100), `description` opcional. |
| `PUT /rbac/roles/:name/permissions` | `roles:manage` | Body obrigatório: `permissions: string[]`; substitui todas as permissões atuais. |
| `PUT /rbac/users/:userId/roles` | `roles:manage` | Body obrigatório: `roles: string[]`; substitui todas as roles do usuário e invalida seu JWT anterior. |

Os links enviados por e-mail apontam para `FRONTEND_URL` (por exemplo, `http://localhost:5173/verify-email?token=...`). Essas URLs representam páginas do frontend; a página lê o token e chama o endpoint correspondente em `/api/v1/auth`. Enquanto o frontend não existir, copie o token do Mailpit e use a coleção Postman.

### Requisições completas

```bash
curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Resposta 200:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ…",
    "refreshToken": "uuid.secret",
    "user": {
      "id": "…",
      "email": "admin@example.com",
      "permissions": ["roles:manage"],
      "authorizationVersion": 1
    }
  },
  "meta": { "requestId": "…" }
}
```

```bash
curl -X PUT http://localhost:3000/api/v1/rbac/roles/manager/permissions -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"permissions":["users:read"]}'
```

Erro 403 típico:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden resource"
  },
  "meta": {
    "requestId": "…",
    "timestamp": "…",
    "path": "/api/v1/rbac/roles"
  }
}
```

## Adicionando o módulo Products

1. Crie `src/modules/products/dto/create-product.dto.ts`:

```ts
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
```

2. Crie `src/modules/products/products.service.ts`. MongoDB: injete `@InjectModel(Product.name)` e crie `schemas/product.schema.ts`. PostgreSQL: adicione `model Product` em `prisma/schema.prisma` e rode `npm run migrate:dev -- --name add-products`.

3. Crie `products.controller.ts`, por exemplo:

```ts
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Permissions(Permission.PRODUCTS_CREATE)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }
}
```

4. Crie `ProductsModule`, registre controller/service e importe-o em `src/app.module.ts`.
5. Adicione `PRODUCTS_CREATE: 'products:create'` ao `src/modules/authorization/permission-catalog.ts`, proteja as rotas, rode o seed e associe a permissão a uma role pelo endpoint RBAC.
6. Adicione auditoria, Swagger, coleção Postman, testes e uma seção de rota nesta documentação na mesma alteração.
