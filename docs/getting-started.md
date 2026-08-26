# Começando um projeto novo

Este roteiro valida que cada template funciona sozinho, sem depender da raiz `nestjs-api-templates` nem do outro banco.

## 1. Escolha somente um template

- MongoDB: copie `templates/api-mongo`;
- PostgreSQL: copie `templates/api-postgres`.

Exemplo:

```bash
cp -R templates/api-mongo ../minha-api
cd ../minha-api
```

A pasta copiada já contém `package.json`, lock independente, Docker, CI, documentação, Postman e configuração de produção.

## 2. Personalize a identidade

Antes de iniciar o desenvolvimento:

1. altere `name` e `version` no `package.json`;
2. ajuste o título do Swagger em `src/main.ts`;
3. altere `OTEL_SERVICE_NAME` em `.env.example` e `.env.production.example`;
4. renomeie a collection Postman, se desejar;
5. inicialize um novo repositório Git.

## 3. Prepare o desenvolvimento

```bash
cp .env.example .env
npm ci
```

Substitua pelo menos:

- `JWT_ACCESS_SECRET`;
- `SEED_ADMIN_EMAIL`;
- `SEED_ADMIN_PASSWORD`.

Para desenvolvimento Docker, mantenha os hosts `mongo`/`postgres`, `redis` e `mailpit` fornecidos no exemplo.

## 4. Suba os containers

```bash
docker compose up --build -d
```

MongoDB:

```bash
docker compose exec api npm run seed
```

PostgreSQL:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
```

## 5. Confirme o ambiente

```bash
docker compose ps
docker compose logs --tail=100 api
```

Abra:

- API: `http://localhost:3000/api/v1/health/ready`;
- Swagger: `http://localhost:3000/docs`;
- Mailpit: `http://localhost:8025`.

Importe a collection localizada em `postman/` e teste seed, login e rotas protegidas.

## 6. Rode a qualidade local

```bash
npm run lint
npm test
npm run build
```

O lint usa `--max-warnings=0`: erros e warnings interrompem a execução local e a CI. Os mocks compartilhados ficam em `test/support`; contratos usados pela regra de negócio pertencem ao diretório `domain` do próprio módulo.

Para validar o fluxo integrado com os containers:

```bash
docker compose exec api npm run test:integration
```

## 7. Ative observabilidade quando precisar

Primeiro encerre o modo normal, sem remover volumes:

```bash
docker compose down
```

Depois:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.observability.yml \
  up --build -d
```

Abra Grafana em `http://localhost:3001` com `admin` / `admin`. Esse usuário é somente do ambiente local.

## 8. Adicione módulos

Siga o [guia para criação de módulos](creating-a-module.md). Ele demonstra o fluxo completo usando `products`, incluindo DTO, controller, service, permissão, persistência, testes, Swagger, Postman e documentação.

## 9. Prepare produção

Use apenas o guia correspondente ao banco escolhido:

- [MongoDB](../templates/api-mongo/docs/production.md);
- [PostgreSQL](../templates/api-postgres/docs/production.md).

O deploy de produção utiliza `docker-compose.production.yml`; não reutilize o Compose de desenvolvimento no servidor.

## Checklist antes do primeiro commit

- [ ] `npm ci` funciona dentro da pasta copiada;
- [ ] lint, testes e build passam;
- [ ] health retorna `200`;
- [ ] seed cria roles e administrador;
- [ ] login salva `accessToken` e `userId` no Postman;
- [ ] confirmação de e-mail aparece no Mailpit;
- [ ] nenhuma credencial real foi adicionada ao Git;
- [ ] nome do pacote e `OTEL_SERVICE_NAME` foram personalizados.
