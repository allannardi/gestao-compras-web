# Continuidade — v0.9.0

## Checkpoint de origem

**v0.8.0 — Experiência mobile e PWA**, validada pelo usuário.

## Patch atual

**v0.9.0 — Preparação para beta**

Pendente de aplicação e validação.

## Migration

```text
database/migrations/013_preparacao_beta_privacidade.sql
```

## Nova configuração obrigatória

Backend/Render:

```text
SUPABASE_SECRET_KEY
```

O nome legado `SUPABASE_SERVICE_ROLE_KEY` também é aceito.

## Principais entregas

- onboarding inicial por usuário;
- privacidade e controle dos dados;
- versão visível do frontend e da API;
- exclusão segura da própria conta;
- exclusão controlada da família;
- limpeza automática de famílias sem membros;
- histórico compartilhado preservado sem referência à conta excluída.

## Validações técnicas

- 93 testes de backend aprovados;
- compilação Python aprovada;
- TypeScript aprovado;
- ESLint aprovado;
- build Next.js aprovado;
- migration analisada por parser PostgreSQL.

## Próximo marco recomendado

Após a validação da v0.9.0:

**v1.0.0 — Beta controlado**, com auditoria final, telemetria técnica mínima,
termos publicados e acompanhamento das primeiras famílias externas.
