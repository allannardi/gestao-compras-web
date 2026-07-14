# Gestão de Compras Web

Aplicação web/PWA para registrar compras domésticas por NFC-e.

## Checkpoint

**v0.3.1 — Primeira gravação de compras**

## Stack

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase Auth + PostgreSQL;
- Vercel e Render.

## Funcionalidades atuais

- famílias isoladas por `familia_id`;
- login e criação da família;
- câmera e foto no iPhone;
- leitura e conferência da NFC-e;
- gravação confirmada de compras;
- produtos e supermercados automáticos;
- histórico inicial de preços;
- bloqueio de NFC-e duplicada.

## Migrations

Execute em ordem:

```text
database/migrations/001_fundacao_familias.sql
database/migrations/002_compras_nfce.sql
```

Consulte `COMO_APLICAR_V0_3_1.md`.
