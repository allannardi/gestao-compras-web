# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Patch atual

**v0.6.1 — Entrada por link de convite**

## Checkpoint de origem

**v0.6.0 — Família, membros e convites**, validada.

## Recursos consolidados

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase PostgreSQL e Auth;
- Vercel e Render;
- famílias isoladas por `familia_id`;
- NFC-e, compras, produtos, resumo e histórico;
- membros, papéis e convites;
- links de convite para usuários novos e existentes.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_6_1.md
```

Execute antes do deploy:

```text
database\migrations\008_fluxo_convite_com_link.sql
```
