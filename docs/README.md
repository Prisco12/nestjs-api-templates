# Guia de manutenção

Este repositório possui dois templates independentes: PostgreSQL/Prisma e MongoDB/Mongoose. Ambos usam NestJS, REST versionada em `/api/v1`, JWT, refresh token com rotação, RBAC, logs, health check, Swagger, Docker e coleções Postman. A observabilidade avançada é opcional e usa OpenTelemetry, Prometheus, Grafana Alloy, Loki, Tempo e Grafana.

## Regra de documentação

Sempre que um endpoint, contrato, regra de autorização, variável de ambiente, comando operacional ou comportamento de persistência mudar, atualize nesta mesma alteração:

1. o README específico do template afetado;
2. a coleção Postman, caso a API pública tenha mudado;
3. este guia ou `architecture.md`, se a decisão for compartilhada pelos templates.

Os logs devem mascarar dados sensíveis, incluindo `Authorization`, cookies e `Set-Cookie`.

Para iniciar um projeto usando somente uma das pastas, consulte [Começando um projeto novo](getting-started.md). Para adicionar um domínio novo, consulte [Criando um módulo](creating-a-module.md). Para validar autenticação e e-mail de ponta a ponta, consulte [Teste de integração do fluxo de conta](integration-testing.md).

## Roles padrão

- `admin`: recebe todas as permissões definidas no catálogo de permissões;
- `user`: role atribuída automaticamente a qualquer cadastro público e inicia sem permissões administrativas.

As permissões disponíveis são registradas em `src/modules/authorization/permission-catalog.ts`. A API administrativa permite criar roles e associar apenas essas permissões cadastradas, protegida por `roles:manage`.

O seed cria e atualiza ambas as roles. Ele também cria ou promove o usuário configurado em `SEED_ADMIN_EMAIL` para `admin`.

Consulte a documentação própria de cada template para comandos de banco, migrations e Docker.

- [Observabilidade PostgreSQL](../templates/api-postgres/docs/observability.md)
- [Observabilidade MongoDB](../templates/api-mongo/docs/observability.md)
- [Produção PostgreSQL](../templates/api-postgres/docs/production.md)
- [Produção MongoDB](../templates/api-mongo/docs/production.md)

As atividades ainda não concluídas estão registradas em [backlog.md](backlog.md).
