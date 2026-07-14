# Gestão de Compras Web

Aplicação mobile/PWA para registrar compras domésticas por NFC-e.

## Checkpoint deste patch

**v0.3.3 — Operação do histórico**

## Stack

- Next.js, React e TypeScript;
- FastAPI e Python;
- Supabase PostgreSQL e Auth;
- Vercel;
- Render;
- uso principal pelo Safari/PWA no iPhone.

## Recursos já validados

- famílias isoladas por `familia_id`;
- login e sessão;
- câmera e foto;
- leitura e consulta da NFC-e;
- gravação real das compras;
- listagem e detalhes em cards mobile;
- filtros do histórico;
- exclusão controlada de compras de teste.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_3_3.md
```

Antes dos testes, execute:

```text
database\migrations\004_operacao_historico.sql
```
