# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Checkpoint deste patch

**v0.5.0 — Dashboard e histórico de preços**

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
- rankings de gastos;
- histórico e variação de preços.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_5_0.md
```

Antes do deploy, execute:

```text
database\migrations\006_dashboard_historico_precos.sql
```
