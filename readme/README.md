# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Patch atual

**v0.6.3 — UX, histórico e fundação Premium**

## Checkpoint de origem

**v0.6.2 — Senhas e segurança**, validada.

## Recursos consolidados

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase PostgreSQL e Auth;
- Vercel e Render;
- famílias isoladas por `familia_id`;
- NFC-e, compras, produtos, resumo e histórico;
- membros, papéis e convites por link;
- alteração e redefinição segura de senha;
- histórico de preços por busca e seletor compacto;
- base interna para licenças Free e Premium.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_6_3.md
```

Execute antes do deploy:

```text
database\migrations\010_premium_historico_filtro.sql
```
