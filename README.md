# Gestão de Compras Web

Aplicação web/PWA para registrar e consultar compras domésticas por NFC-e.

## Checkpoint

**v0.3.2 — Compras e detalhes**

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
- bloqueio de NFC-e duplicada;
- navegação entre Adicionar e Compras;
- listagem de compras em cards mobile;
- detalhes e itens na própria página, sem modal pesado.

## Migrations

Execute em ordem:

```text
database/migrations/001_fundacao_familias.sql
database/migrations/002_compras_nfce.sql
database/migrations/003_consulta_compras.sql
```

Consulte `COMO_APLICAR_V0_3_2.md`.
