# Changelog — Gestão de Compras Web

## v0.3.1 — Primeira gravação de compras

- adiciona migration `002_compras_nfce.sql`;
- cria tabelas de compras, itens, produtos, supermercados, categorias e histórico de preços;
- registra a compra de forma atômica por RPC no PostgreSQL;
- deriva `familia_id` exclusivamente da sessão autenticada;
- bloqueia NFC-e duplicada dentro da mesma família;
- cria ou reaproveita supermercado e produtos;
- cria categoria inicial `Não classificado`;
- grava histórico de preços;
- adiciona endpoint autenticado `POST /api/v1/compras`;
- adiciona confirmação explícita antes da gravação;
- adiciona o logo oficial no primeiro card da autenticação;
- adiciona os textos `GESTÃO DE COMPRAS` e `ACESSE A SUA CONTA`;
- preserva login, famílias, câmera, foto, QR Code, Vercel e Render.

## v0.3.0 — Fundação SaaS por Famílias

- Supabase Auth;
- criação automática de família e administrador;
- isolamento por `familia_id` e RLS;
- sessão e endpoints protegidos;
- leitura da NFC-e preservada.
