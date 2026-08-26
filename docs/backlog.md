# Backlog

Este arquivo reúne atividades aprovadas, mas ainda não concluídas, para os templates MongoDB e PostgreSQL.

## Prioridade alta

- [x] Validar envio SMTP real fora da rede corporativa nas portas 465 e 587.
- [x] Confirmar no log `email verification email accepted by SMTP` e verificar entrega na caixa de entrada ou spam.
- [x] Executar o fluxo completo de conta em Docker nos dois templates: cadastro, confirmação de e-mail, login, recuperação de senha, redefinição, revogação de sessões e auditoria.
- [x] Automatizar o fluxo de e-mail nos testes de integração e na CI usando a API do Mailpit para localizar a mensagem e extrair o token.
- [x] Corrigir o warning `Unsupported route path: "/api/*"` emitido pelo NestJS/Express durante a inicialização.
- [x] Remover casts `any` inseguros dos services/testes e fazer a CI falhar quando o lint produzir warnings.

## Frontend — adiado

- [ ] Criar a página `/verify-email`, ler o token da URL e chamar `POST /api/v1/auth/verify-email`.
- [ ] Criar a página `/reset-password`, receber a nova senha e chamar `POST /api/v1/auth/reset-password`.

## Preparação para produção

- [ ] Escolher um provedor transacional de e-mail ou liberar SMTP externo na infraestrutura.
- [ ] Avaliar integração por API HTTPS quando a infraestrutura bloquear as portas SMTP.
- [ ] Configurar domínio de envio, SPF, DKIM e DMARC.
- [ ] Armazenar credenciais SMTP/API no gerenciador de secrets do ambiente de deploy.
- [ ] Configurar e validar a `FRONTEND_URL` pública.
- [ ] Definir retenção e armazenamento persistente de logs, métricas e traces conforme o ambiente.
- [ ] Configurar alertas de disponibilidade, taxa de erros 5xx e latência p95 na plataforma escolhida.

## Produção — base concluída

- [x] Criar Compose de produção independente para os dois templates.
- [x] Publicar somente Caddy nas portas `80/443`.
- [x] Bloquear `/api/v1/metrics` e `/docs` no acesso externo.
- [x] Manter banco, Redis, Loki, Tempo, Prometheus e Alloy somente na rede interna.
- [x] Restringir Grafana a `127.0.0.1` para acesso por túnel SSH.
- [x] Preservar o IP real do cliente atrás de um único proxy confiável.

## Critério de conclusão do fluxo de e-mail

O fluxo será considerado concluído quando os testes automatizados passarem nos dois bancos e houver pelo menos uma validação de entrega real por um provedor externo.
