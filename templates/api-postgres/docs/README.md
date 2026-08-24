# Documentação — template PostgreSQL

## Stack

NestJS, PostgreSQL, Prisma, JWT, Argon2, Pino, Swagger, Docker e Postman.

## Configuração local

1. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, segredos JWT e credenciais de seed.
2. Instale dependências: `npm install`.
3. Aplique o schema: `npm run migrate:dev -- --name init`.
4. Crie ou sincronize roles e permissões: `npm run seed:rbac`.
5. Crie o administrador inicial: `npm run seed:admin`.
6. Inicie: `npm run start:dev`.

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

Cada login cria uma sessão. Tokens expirados do usuário são removidos no login e uma tarefa diária às 03:00 remove tokens expirados globalmente. A migration inclui o índice `userId + expiresAt` para essa consulta.

Após atualizar o template existente, aplique:

```bash
npm run migrate:dev -- --name add-refresh-token-cleanup-index
npm run seed:rbac
npm run seed:admin
```

## Rate limiting

Todas as rotas são limitadas por IP a `RATE_LIMIT_MAX` requisições a cada `RATE_LIMIT_TTL_MS` milissegundos; o padrão é 100 requisições por minuto. Redis mantém os contadores compartilhados entre instâncias. As rotas públicas de autenticação possuem limites mais restritivos:

- `POST /api/v1/auth/register`: 10 tentativas a cada 15 minutos e, além disso, no máximo 3 contas criadas por hora e 5 por dia, por IP;
- `POST /api/v1/auth/login`: 20 requisições a cada 15 minutos, mais bloqueio gradual após falhas;
- `POST /api/v1/auth/refresh`: 20 requisições por minuto.

Após 5 credenciais inválidas para a combinação e-mail + IP, login aplica espera gradual: 5 minutos, 15 minutos e 1 hora. Um login válido zera o contador. Ao exceder um limite, a API responde `429 Too Many Requests` no formato padrão de erro. Configure `REDIS_URL` para execução local; no Docker ela é definida automaticamente.

## API e testes manuais

Importe `postman/api-postgres.postman_collection.json` no Postman. A coleção salva access e refresh tokens automaticamente após login/refresh.

## Docker

Use `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nest_api?schema=public` no `.env` e execute `docker compose up --build`. Redis também sobe automaticamente. Depois aplique a migration e execute `docker compose exec api npm run seed:rbac` e `docker compose exec api npm run seed:admin`.
