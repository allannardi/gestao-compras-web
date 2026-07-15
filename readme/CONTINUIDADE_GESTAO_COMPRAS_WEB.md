# Continuidade — Gestão de Compras Web

## Estado atual

Checkpoint de origem validado: **v0.3.3 — Operação do histórico**.

Patch atual: **v0.4.0 — Produtos e classificação**.

## Funcionalidades consolidadas

- Next.js na Vercel;
- FastAPI no Render;
- Supabase Auth e PostgreSQL;
- famílias isoladas por `familia_id`;
- câmera e foto no iPhone;
- consulta da NFC-e;
- gravação de compras, itens, produtos, supermercados e histórico;
- listagem de compras em cards;
- detalhes na própria página;
- filtros e exclusão controlada de compras de teste;
- itens exibidos do maior para o menor valor total.

## Alterações da v0.4.0

- tela Produtos em cards mobile;
- indicadores do catálogo;
- busca e filtros;
- filtro rápido Para revisar;
- edição de nome, marca, unidade e categoria;
- criação de categorias personalizadas;
- categorias padrão por família;
- classificação automática de novos produtos;
- reclassificação dos produtos ainda pendentes;
- preservação das categorias já revisadas.

## Regras importantes de produtos

- produtos são criados automaticamente pela leitura da NFC-e;
- um produto existente mantém sua categoria revisada;
- a reclassificação atua somente em produtos com `revisar = true` e categoria Não classificado;
- a edição manual confirma a revisão;
- selecionar Não classificado mantém o produto na fila Para revisar;
- todo produto, categoria e operação permanece isolado por `familia_id`.

## Banco

Migration obrigatória:

```text
database/migrations/005_produtos_classificacao.sql
```

## Próxima versão planejada

**v0.5.0 — Histórico de preços e dashboard**

Escopo sugerido:

- histórico por produto;
- variação de preços;
- resumo mensal;
- top produtos;
- gastos por categoria;
- gastos por supermercado;
- cards e gráficos leves para o iPhone.

## Regra de continuidade

Toda nova versão deve partir do último checkpoint validado e gerar patch ZIP real. A documentação `.md` e `.txt` deve permanecer na pasta `readme`.
