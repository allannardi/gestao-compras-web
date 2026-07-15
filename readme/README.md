# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Checkpoint deste patch

**v0.4.0 — Produtos e classificação**

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
- câmera e foto;
- leitura e consulta da NFC-e;
- gravação real das compras;
- listagem e detalhes em cards mobile;
- filtros e exclusão controlada de compras;
- catálogo de produtos;
- categorias e revisão mobile;
- classificação automática preservando revisões manuais.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_4_0.md
```

Antes do deploy, execute:

```text
database\migrations\005_produtos_classificacao.sql
```
