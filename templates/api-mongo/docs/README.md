# Documentação — template MongoDB

## Stack

NestJS, MongoDB, Mongoose, JWT, Argon2, Pino, Swagger, Docker e Postman.

## Configuração local

1. Copie `.env.example` para `.env` e preencha `MONGODB_URI`, segredos JWT e credenciais de seed.
2. Instale dependências: `npm install`.
3. Crie ou sincronize roles e permissões: `npm run seed:rbac`.
4. Crie o administrador inicial: `npm run seed:admin`.
5. Inicie: `npm run start:dev`.

`npm run seed` é um atalho para executar os dois comandos acima. O `seed:admin` nunca troca a senha de um administrador já existente. Ao adicionar permissões ao catálogo, execute somente `npm run seed:rbac`.

Após esta alteração, quem se cadastra em `POST /api/v1/auth/register` recebe automaticamente a role `user`. Isso exige que o seed tenha sido executado.

## Administração de roles e permissões

Todos os endpoints abaixo exigem um access token com `roles:manage`. O administrador criado pelo seed recebe essa permissão após executar o seed e fazer login novamente.

- `GET /api/v1/rbac/permissions`: lista as permissões permitidas pelo template;
- `GET /api/v1/rbac/roles`: lista roles e suas permissões;
- `POST /api/v1/rbac/roles`: cria uma role;
- `PUT /api/v1/rbac/roles/:name/permissions`: substitui as permissões da role;
- `PUT /api/v1/rbac/users/:userId/roles`: substitui as roles do usuário.

As permissões continuam declaradas em `src/modules/authorization/permission-catalog.ts`; a API não aceita strings de permissão arbitrárias. Depois de alterar roles/permissões de um usuário, ele deve fazer login novamente (ou usar o refresh token) para receber o JWT atualizado.

## Refresh tokens

Cada login cria uma sessão. Tokens expirados do usuário são removidos no login. Além disso, há um índice TTL em `expiresAt`, que permite ao MongoDB remover tokens expirados globalmente em segundo plano.

## Refresh token em cookie HttpOnly

`POST /auth/login` e `POST /auth/refresh` retornam somente `accessToken` e `user` no JSON. O refresh token é enviado no cookie `refresh_token`, com `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` e `Secure` em produção. `POST /auth/refresh` e `POST /auth/logout` não recebem body: o navegador ou cookie jar do Postman envia o cookie automaticamente.

No frontend, use `credentials: 'include'` em login, refresh e logout. Mantenha o access token apenas em memória e envie-o no header `Authorization`. Se frontend e API estiverem em sites diferentes, use `SameSite=None; Secure` e proteção CSRF para operações que alteram dados.

## Rate limiting

Todas as rotas são limitadas por IP a `RATE_LIMIT_MAX` requisições a cada `RATE_LIMIT_TTL_MS` milissegundos; o padrão é 100 requisições por minuto. Redis mantém os contadores compartilhados entre instâncias. As rotas públicas de autenticação possuem limites mais restritivos:

- `POST /api/v1/auth/register`: 10 tentativas a cada 15 minutos e, além disso, no máximo 3 contas criadas por hora e 5 por dia, por IP;
- `POST /api/v1/auth/login`: 20 requisições a cada 15 minutos, mais bloqueio gradual após falhas;
- `POST /api/v1/auth/refresh`: 20 requisições por minuto.

Após 5 credenciais inválidas para a combinação e-mail + IP, login aplica espera gradual: 5 minutos, 15 minutos e 1 hora. Um login válido zera o contador. Ao exceder um limite, a API responde `429 Too Many Requests` no formato padrão de erro. Configure `REDIS_URL` para execução local; no Docker ela é definida automaticamente.

## Testes automatizados

Execute a suíte unitária sem depender de MongoDB, Redis ou Docker:

```bash
npm test
npm run test:cov
```

A cobertura atual valida regras de Auth, Rate Limit, Users e RBAC: e-mail duplicado, login inválido, bloqueio após cinco falhas, quota de cadastro, role padrão `user` e erros de role inexistente/duplicada. Use `npm run test:watch` durante o desenvolvimento.

## Auditoria

`GET /api/v1/audit-logs` exige `audit:read` e aceita `page`, `limit`, `actorId`, `action`, `resource`, `resourceId`, `status`, `from` e `to`. Datas devem estar em ISO 8601. Alterações de RBAC e eventos de autenticação são registrados com contexto da requisição.

## CI e integração

O workflow `.github/workflows/ci.yml` compila, executa lint e testes unitários para os dois templates em cada push e Pull Request. Depois sobe Docker, executa seed e valida health, login, refresh por cookie, RBAC, auditoria, logout e rate limit. Localmente, com a API Docker em execução e seed aplicado, use `docker compose exec api npm run test:integration`.

Ao copiar somente este template para um repositório novo, mantenha a pasta `.github/` que já está dentro dele. A CI standalone funciona sem os demais diretórios deste monorepo.

## API e testes manuais

Importe `postman/api-mongo.postman_collection.json` no Postman. A coleção salva access e refresh tokens automaticamente após login/refresh.

## Docker

Use `MONGODB_URI=mongodb://mongo:27017/nest_api` no `.env` e execute `docker compose up --build`. Redis também sobe automaticamente. Em seguida, rode `docker compose exec api npm run seed`.
