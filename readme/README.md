# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Checkpoint deste patch

**v0.6.0 — Família, membros e convites**

## Stack

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase PostgreSQL e Auth;
- Vercel;
- Render;
- uso principal pelo Safari/PWA no iPhone.

## Recursos consolidados

- famílias isoladas por `familia_id`;
- login e sessão;
- câmera, foto e NFC-e;
- gravação, listagem e detalhes de compras;
- produtos e categorias;
- classificação automática;
- dashboard mensal;
- histórico e variação de preços;
- configurações da família;
- membros, papéis, convites e troca de família.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_6_0.md
```

Antes do deploy, execute:

```text
database\migrations\007_configuracoes_familia_membros.sql
```
