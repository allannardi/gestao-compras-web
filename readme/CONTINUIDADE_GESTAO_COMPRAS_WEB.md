# Continuidade — Gestão de Compras Web

## Estado atual

Checkpoint de origem validado: **v0.3.2 — Compras e detalhes**.

Patch atual: **v0.3.3 — Operação do histórico**.

## Funcionalidades consolidadas

- Next.js na Vercel;
- FastAPI no Render;
- Supabase Auth e PostgreSQL;
- famílias isoladas por `familia_id`;
- câmera e foto no iPhone;
- consulta da NFC-e;
- gravação de compras, itens, produtos, supermercados e histórico;
- listagem em cards;
- detalhes na própria página;
- bloqueio de NFC-e duplicada.

## Alterações da v0.3.3

- confirmação e detalhes exibem itens do maior para o menor valor total;
- filtro por supermercado;
- filtro por mês;
- exclusão de compras de teste somente para administradores;
- confirmação digitando `EXCLUIR`;
- atualização imediata da listagem;
- documentação centralizada na pasta `readme`.

## Banco

Migration obrigatória:

```text
database/migrations/004_operacao_historico.sql
```

A exclusão remove:

- compra;
- itens da compra;
- histórico de preços ligado à compra.

A exclusão preserva:

- produtos;
- categorias;
- supermercados.

## Próxima versão planejada

**v0.4.0 — Produtos e classificação**

Escopo sugerido:

- tela Produtos;
- filtro “Para revisar”;
- categorias;
- edição mobile;
- classificação automática;
- manutenção da categoria já revisada.

## Regra de continuidade

Toda nova versão deve partir do último checkpoint validado e gerar patch ZIP real. A documentação `.md` e `.txt` deve ser colocada na pasta `readme`.
