# Teste de integração do fluxo de conta

Os dois templates executam o mesmo cenário real por meio de `npm run test:integration`. O script roda dentro do container da API e usa a API HTTP interna do Mailpit, sem depender de copiar tokens manualmente.

## O que é validado

1. health check da API;
2. cadastro de um usuário único;
3. bloqueio do login antes da confirmação do e-mail;
4. localização do e-mail de confirmação no Mailpit e extração do token;
5. confirmação do e-mail e rejeição da reutilização do token;
6. login e emissão do cookie HttpOnly;
7. rotação do refresh token e rejeição do token anterior;
8. solicitação e e-mail de recuperação de senha;
9. redefinição da senha e revogação das sessões existentes;
10. rejeição da senha antiga e login com a nova senha;
11. acesso a `/users/me`;
12. acesso administrativo ao RBAC e confirmação do evento de auditoria;
13. logout e rejeição do refresh token revogado;
14. bloqueio gradual depois de cinco logins inválidos.

## Execução local

MongoDB:

```bash
cd templates/api-mongo
cp .env.example .env
docker compose up --build -d
docker compose exec -T api npm run seed
docker compose exec -T api npm run test:integration
```

PostgreSQL:

```bash
cd templates/api-postgres
cp .env.example .env
docker compose up --build -d
docker compose exec -T api npx prisma migrate deploy
docker compose exec -T api npm run seed
docker compose exec -T api npm run test:integration
```

Use o SMTP local do `.env.example` durante esse teste: `MAIL_HOST=mailpit`, `MAIL_PORT=1025` e `MAIL_SECURE=false`. `MAILPIT_API_URL` é opcional e assume `http://mailpit:8025` dentro do Docker.

O comando `npm run test:integration:smoke` mantém uma verificação curta do administrador semeado. O fluxo completo é o comando obrigatório da CI.

## GitHub Actions

O workflow da raiz usa uma matriz com MongoDB e PostgreSQL. Cada template também contém uma workflow standalone em `.github/workflows/ci.yml`. Em ambos os casos, a CI cria um `.env` a partir de `.env.example`, sobe apenas os serviços do template selecionado e executa o fluxo completo.
