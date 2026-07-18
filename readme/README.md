# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Patch atual

**v0.6.2 — Senhas e segurança**

## Checkpoint de origem

**v0.6.1.1 — Entrada por link de convite**, validada.

## Recursos consolidados

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase PostgreSQL e Auth;
- Vercel e Render;
- famílias isoladas por `familia_id`;
- NFC-e, compras, produtos, resumo e histórico;
- membros, papéis e convites por link;
- alteração da própria senha;
- redefinição segura de senha de membros.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_6_2.md
```

Execute antes do deploy:

```text
database\migrations\009_senhas_seguranca.sql
```
