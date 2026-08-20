# Documentação — template MongoDB

## Stack

NestJS, MongoDB, Mongoose, JWT, Argon2, Pino, Swagger, Docker e Postman.

## Configuração local

1. Copie `.env.example` para `.env` e preencha `MONGODB_URI`, segredos JWT e credenciais de seed.
2. Instale dependências: `npm install`.
3. Crie roles, permissões e administrador: `npm run seed`.
4. Inicie: `npm run start:dev`.

Após esta alteração, quem se cadastra em `POST /api/v1/auth/register` recebe automaticamente a role `user`. Isso exige que o seed tenha sido executado.

## Refresh tokens

Cada login cria uma sessão. Tokens expirados do usuário são removidos no login. Além disso, há um índice TTL em `expiresAt`, que permite ao MongoDB remover tokens expirados globalmente em segundo plano.

## API e testes manuais

Importe `postman/api-mongo.postman_collection.json` no Postman. A coleção salva access e refresh tokens automaticamente após login/refresh.

## Docker

Use `MONGODB_URI=mongodb://mongo:27017/nest_api` no `.env` e execute `docker compose up --build`. Em seguida, rode `docker compose exec api npm run seed`.
