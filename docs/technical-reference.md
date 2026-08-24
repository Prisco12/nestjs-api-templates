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

Os dois templates usam `@nestjs/throttler` com contador em memória por IP. O limite global vem de `RATE_LIMIT_MAX` e `RATE_LIMIT_TTL_MS` (padrão: 100 requisições por minuto). Cadastro, login e refresh token possuem limites próprios de 5/hora, 5/15 minutos e 20/minuto, respectivamente. Ao exceder um limite, a resposta é `429 Too Many Requests` no formato padrão de erro.

Em produção com múltiplas instâncias da API, substitua o armazenamento em memória por Redis para que o contador seja compartilhado entre os containers.

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
| `User` | `id UUID PK`, `email varchar(320) UNIQUE`, `passwordHash`, `isActive boolean default true`, `authorizationVersion int default 1`, timestamps | N:N com Role; 1:N RefreshToken | `{ "id":"0f…", "email":"admin@example.com", "isActive":true, "authorizationVersion":1 }` |
| `Role` | `id UUID PK`, `name varchar(100) UNIQUE`, `description nullable` | N:N User e Permission | `{ "name":"admin", "description":"Template administrator" }` |
| `Permission` | `id UUID PK`, `code varchar(150) UNIQUE`, `description nullable` | N:N Role | `{ "code":"users:read" }` |
| `UserRole` | `userId UUID`, `roleId UUID`, PK composta | liga User e Role; cascade delete | `{ "userId":"0f…", "roleId":"1a…" }` |
| `RolePermission` | `roleId UUID`, `permissionId UUID`, PK composta | liga Role e Permission; cascade delete | `{ "roleId":"1a…", "permissionId":"2b…" }` |
| `RefreshToken` | `id UUID PK`, `tokenHash`, `expiresAt`, `revokedAt nullable`, `userId`, `createdAt`; índice `userId, expiresAt` | pertence a User | `{ "id":"…", "expiresAt":"2026-09-01T00:00:00Z", "revokedAt":null }` |
| `AuditLog` | `id UUID PK`, `actorId nullable`, `action`, `resource`, `resourceId nullable`, `status`, `beforeData/afterData JSON nullable`, contexto e data | referência lógica ao executor | `{ "action":"RBAC_ROLE_CREATED", "resource":"roles", "status":"SUCCESS" }` |

### MongoDB

| Coleção | Campos e restrições | Relacionamentos | Exemplo |
|---|---|---|---|
| `users` | `_id ObjectId`, `email unique`, `passwordHash`, `isActive`, `authorizationVersion`, `roles ObjectId[]`, timestamps | roles referenciam `roles` | `{ "email":"admin@example.com", "roles":["66…"], "authorizationVersion":1 }` |
| `roles` | `_id ObjectId`, `name unique`, `description opcional`, `permissions string[]`, timestamps | usada por users | `{ "name":"manager", "permissions":["users:read"] }` |
| `refreshtokens` | `tokenId unique`, `tokenHash`, `expiresAt TTL`, `revokedAt opcional`, `userId ObjectId indexado`, timestamps | pertence a user | `{ "tokenId":"uuid", "userId":"66…", "revokedAt":null }` |
| `auditlogs` | `actorId`, `action indexado`, `resource`, `resourceId`, `status`, `before`, `after`, contexto, `createdAt` | referência lógica ao executor | `{ "action":"AUTH_LOGIN_SUCCESS", "resource":"auth", "status":"SUCCESS" }` |

## Endpoints

Autenticação Bearer usa `Authorization: Bearer <accessToken>`. Endpoints RBAC exigem `roles:manage`; auditoria exige `audit:read`; listagem de usuários exige `users:read`.

| Método e rota | Auth | Descrição e parâmetros |
|---|---|---|
| `GET /health` | pública | Liveness; responde `{status:"ok"}`. |
| `GET /health/ready` | pública | Readiness; consulta o banco. Retorna 503 se indisponível. |
| `POST /auth/register` | pública | Body obrigatório: `email` (email), `password` (senha válida). Cria usuário com role `user`. |
| `POST /auth/login` | pública | Body: `email`, `password`. Retorna access token, refresh token e usuário. Erro 401 para credenciais inválidas. |
| `POST /auth/refresh` | pública | Body: `refreshToken`. Rotaciona a sessão e emite novo par de tokens. |
| `POST /auth/logout` | Bearer | Body: `refreshToken`. Revoga a sessão; responde 204. |
| `GET /users/me` | Bearer | Retorna perfil do usuário autenticado. |
| `GET /users?page=1&limit=20` | `users:read` | Paginação; `page` e `limit` são inteiros, limit máximo 100. |
| `GET /audit-logs?page=1&limit=20` | `audit:read` | Lista auditorias por data decrescente. |
| `GET /rbac/permissions` | `roles:manage` | Lista permissões suportadas pelo catálogo. |
| `GET /rbac/roles` | `roles:manage` | Lista roles e permissões. |
| `POST /rbac/roles` | `roles:manage` | Body: `name` obrigatório (`^[a-z][a-z0-9_-]*$`, 2–100), `description` opcional. |
| `PUT /rbac/roles/:name/permissions` | `roles:manage` | Body obrigatório: `permissions: string[]`; substitui todas as permissões atuais. |
| `PUT /rbac/users/:userId/roles` | `roles:manage` | Body obrigatório: `roles: string[]`; substitui todas as roles do usuário e invalida seu JWT anterior. |

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
