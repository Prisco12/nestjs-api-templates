# API Mongo Template

Aplicação NestJS independente com MongoDB e Mongoose, autenticação JWT, refresh token em cookie HttpOnly, RBAC, auditoria, rate limit, e-mail, observabilidade, Docker, Swagger, Postman e CI.

A coleção Postman está em `postman/api-mongo.postman_collection.json`.

## Docker

1. Copie `.env.example` para `.env` e defina `JWT_ACCESS_SECRET`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
2. Para Docker, use `MONGODB_URI=mongodb://mongo:27017/nest_api`.
3. Execute `docker compose up --build`.
4. Em outro terminal, crie roles e permissões: `docker compose exec api npm run seed:rbac`.
5. Crie o administrador inicial: `docker compose exec api npm run seed:admin`.

O comando `npm run seed` executa os dois passos como bootstrap completo. Para adicionar uma nova permissão ao catálogo, execute apenas `npm run seed:rbac`.

Valide o fluxo completo com `docker compose exec -T api npm run test:integration`. O teste usa o Mailpit interno e não exige copiar tokens manualmente.
