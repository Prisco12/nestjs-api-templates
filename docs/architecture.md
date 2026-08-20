# Arquitetura dos templates

## Objetivo

Oferecer duas bases de API REST NestJS com a mesma experiência de uso e decisões transversais, mas com persistência adequada a cada banco.

## Organização de um módulo

```text
src/modules/<modulo>/
  application/       # casos de uso e portas de saída
  domain/            # entidades e contratos de repositório
  infrastructure/    # adaptadores: Prisma ou Mongoose, e integrações externas
  presentation/      # controller, DTOs e documentação HTTP
  <modulo>.module.ts
```

Para módulos pequenos, as camadas podem ser mantidas mais compactas. A divisão é obrigatória apenas quando traz separação real entre regra de negócio e infraestrutura.

## Convenções HTTP

- Prefixo: `/api`.
- Versão inicial: `/v1`.
- Sucesso: `{ "data": ..., "meta": ... }`.
- Falha: `{ "statusCode", "code", "message", "details", "requestId" }`.
- Listagens: paginação por `page`/`limit` inicialmente; cursor será adotado em recursos de grande volume.
- Datas: ISO 8601 em UTC.
- Identificadores: UUID no PostgreSQL e ObjectId serializado como string no MongoDB.

## Autenticação e autorização

- JWT Bearer como access token, de curta duração;
- refresh token de longa duração, rotacionado a cada renovação e armazenado somente como hash;
- decorator `@Public()` para exceções explícitas à proteção global;
- decorator `@Permissions()` e guard de permissões;
- roles apenas como conjuntos de permissões.

## Segurança e operação

- validação global com whitelist e rejeição de campos inesperados;
- hash de senha com Argon2;
- CORS por ambiente, Helmet e rate limiting;
- configuração validada no boot;
- logs estruturados com request ID;
- Swagger, health checks e encerramento gracioso;
- segredos apenas em variáveis de ambiente, nunca em arquivos versionados.

## Persistência

O contrato do repositório pertence ao módulo de domínio. Cada template implementa seu próprio adaptador:

- PostgreSQL: Prisma, UUID, migrations e transações quando a regra exigir consistência entre entidades.
- MongoDB: Mongoose, schemas, índices e operações atômicas/documentais quando apropriado.

Não haverá um `GenericRepository`: cada contrato deve expressar operações úteis ao domínio, evitando abstrações que escondem características importantes de cada banco.
