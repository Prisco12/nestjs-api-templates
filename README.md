# NestJS API Templates

Repositório de manutenção para dois templates independentes de API REST em NestJS:

- `templates/api-postgres`: PostgreSQL com Prisma;
- `templates/api-mongo`: MongoDB com Mongoose.

Cada pasta em `templates/` será uma aplicação NestJS completa, com dependências e ciclo de deploy próprios. Elas **não** alternam o banco por variável de ambiente.

## Decisões de arquitetura

- monólito modular orientado a domínio;
- REST com prefixo `/api` e versionamento URI (`/v1`);
- controllers finos, serviços por módulo e persistência acessada diretamente pelo Prisma ou Mongoose;
- autorização baseada em permissões, com roles agrupando permissões;
- access token JWT curto e refresh token com rotação;
- respostas, erros, paginação e observabilidade com convenções idênticas entre os templates.

Leia o guia de manutenção em [docs/README.md](docs/README.md) e as decisões em [docs/architecture.md](docs/architecture.md).

## Estrutura

```text
packages/core/             # contratos e utilitários que só serão extraídos quando forem realmente compartilhados
templates/api-mongo/       # aplicação NestJS + Mongoose
templates/api-postgres/    # aplicação NestJS + Prisma
docs/                      # decisões arquiteturais e convenções
```

## Construção incremental

1. Convenções e estrutura do repositório;
2. Bootstrap NestJS e componentes transversais;
3. Auth, Users e RBAC;
4. Persistência específica de cada banco;
5. Docker, testes, Swagger, health checks e CI.

## Documentação

Documentação deve acompanhar cada alteração funcional. Os guias específicos estão em:

- [PostgreSQL](templates/api-postgres/docs/README.md)
- [MongoDB](templates/api-mongo/docs/README.md)
