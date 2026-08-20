# API Mongo Template

Aplicação NestJS independente com MongoDB e Mongoose. A implementação será adicionada incrementalmente.

A coleção Postman está em `postman/api-mongo.postman_collection.json`.

## Docker

1. Copie `.env.example` para `.env` e defina `JWT_ACCESS_SECRET`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
2. Para Docker, use `MONGODB_URI=mongodb://mongo:27017/nest_api`.
3. Execute `docker compose up --build`.
4. Em outro terminal, execute `docker compose exec api npm run seed`.
