# Guia de manutenção

Este repositório possui dois templates independentes: PostgreSQL/Prisma e MongoDB/Mongoose. Ambos usam NestJS, REST versionada em `/api/v1`, JWT, refresh token com rotação, RBAC, logs, health check, Swagger, Docker e coleções Postman.

## Regra de documentação

Sempre que um endpoint, contrato, regra de autorização, variável de ambiente, comando operacional ou comportamento de persistência mudar, atualize nesta mesma alteração:

1. o README específico do template afetado;
2. a coleção Postman, caso a API pública tenha mudado;
3. este guia ou `architecture.md`, se a decisão for compartilhada pelos templates.

Os logs devem mascarar dados sensíveis, incluindo `Authorization`, cookies e `Set-Cookie`.

## Roles padrão

- `admin`: recebe todas as permissões definidas em `access-control.ts`;
- `user`: role atribuída automaticamente a qualquer cadastro público e inicia sem permissões administrativas.

As permissões disponíveis são registradas em `src/authorization/access-control.ts`. A API administrativa permite criar roles e associar apenas essas permissões cadastradas, protegida por `roles:manage`.

O seed cria e atualiza ambas as roles. Ele também cria ou promove o usuário configurado em `SEED_ADMIN_EMAIL` para `admin`.

Consulte a documentação própria de cada template para comandos de banco, migrations e Docker.
