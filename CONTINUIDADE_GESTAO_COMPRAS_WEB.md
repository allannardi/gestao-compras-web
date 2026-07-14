# Continuidade — Gestão de Compras Web

## Último checkpoint validado antes deste patch

**v0.3.1 — Primeira gravação de compras**

Foram validados online no iPhone:

- autenticação e famílias;
- câmera, foto, QR Code e consulta da NFC-e;
- gravação real no Supabase/PostgreSQL;
- criação de compras, itens, produtos, supermercados e histórico de preços;
- bloqueio de NFC-e duplicada;
- isolamento por `familia_id`;
- identidade visual no login.

## Patch atual

**v0.3.2 — Compras e detalhes**

Esta versão adiciona:

- navegação principal `Adicionar` e `Compras`;
- listagem em cards mobile;
- paginação do histórico;
- detalhes da compra na própria página;
- itens com quantidade, unidade, valor unitário, total e categoria;
- estados de carregamento, erro e lista vazia;
- atalho para abrir o histórico após salvar uma compra.

## Regras preservadas

- frontend Next.js na Vercel;
- backend FastAPI no Render;
- Supabase Auth e PostgreSQL;
- isolamento obrigatório por `familia_id`;
- uso principal no iPhone/PWA;
- cards compactos no mobile;
- detalhes sem modal pesado;
- projeto Streamlit v0.5.14 preservado como referência funcional;
- ambiente online é a principal forma de validação.

## Migration nova

Executar depois das migrations anteriores:

```text
database/migrations/003_consulta_compras.sql
```

## Próximo passo depois da validação

A próxima versão deverá organizar a operação do histórico, incluindo ações controladas sobre compras de teste e os primeiros filtros mobile, sem iniciar ainda o dashboard completo.
