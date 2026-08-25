# Criando um novo módulo

Exemplo: `products`.

1. Crie `src/modules/products` com `products.module.ts`, controller, service, DTOs e, no MongoDB, `schemas/product.schema.ts`.
2. Defina as rotas REST e DTOs: `CreateProductDto`, `UpdateProductDto` e filtros de listagem. Valide todos os dados com `class-validator`.
3. Implemente a regra de negócio em `ProductsService`; controllers apenas recebem a requisição e chamam o serviço.
4. Persistência: no MongoDB registre o schema no módulo; no PostgreSQL altere `prisma/schema.prisma`, execute `npm run migrate:dev -- --name add-products` e gere o client.
5. Registre `ProductsModule` em `AppModule`.
6. Adicione permissões no `modules/authorization/permission-catalog.ts`, por exemplo `products:read`, `products:create`, `products:update` e `products:delete`.
7. Proteja cada rota com `@Permissions(Permission.PRODUCTS_READ)`. Rode o seed e use RBAC para associar as novas permissões às roles desejadas.
8. Crie auditoria para criação, edição e exclusão, sem registrar dados sensíveis.
9. Para rotas de listagem, receba `@PaginationParams() pagination: PaginationParams` no controller. A service deve consultar os itens e o total, retornando `createPaginatedResult(items, pagination.page, pagination.limit, totalItems)`. O interceptor inclui os dados de paginação em `meta`.
10. Atualize Swagger, coleção Postman, testes unitários/e2e e `api-reference.md` na mesma alteração.

Checklist: build passa, migration aplicada (PostgreSQL), seed sincronizado, rota protegida, paginação aplicada às listas, Postman atualizado e documentação revisada.
