# Continuidade — Gestão de Compras Web

## Último checkpoint validado

**v0.8.0 — Experiência mobile e PWA**

Validado pelo usuário no ambiente online e no iPhone.

## Patch atual

**v0.9.0 — Preparação para beta**

Pendente de aplicação e validação.

## Alterações

- guia inicial com progresso por família;
- privacidade e controle dos dados;
- identificação da versão do frontend e backend;
- exclusão segura da conta com reautenticação;
- exclusão controlada de família;
- limpeza automática de famílias sem membros;
- preservação de históricos compartilhados sem identificar conta removida;
- nova migration 013;
- nova variável `SUPABASE_SECRET_KEY` somente no Render.

## Validações técnicas

- 93 testes de backend aprovados;
- compilação Python aprovada;
- TypeScript aprovado;
- ESLint aprovado;
- build Next.js aprovado;
- SQL analisado por parser PostgreSQL.

## Regra de continuidade

A v0.9.0 somente passa a ser baseline depois da validação no Supabase, Render,
Vercel e iPhone.

## Próximo marco recomendado

**v1.0.0 — Beta controlado**
