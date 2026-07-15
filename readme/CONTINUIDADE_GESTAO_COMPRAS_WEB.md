# Continuidade — Gestão de Compras Web

## Estado atual

Checkpoint de origem validado: **v0.4.0 — Produtos e classificação**.

Patch atual: **v0.5.0 — Dashboard e histórico de preços**.

## Funcionalidades consolidadas

- Next.js na Vercel;
- FastAPI no Render;
- Supabase Auth e PostgreSQL;
- famílias isoladas por `familia_id`;
- câmera e foto no iPhone;
- consulta e gravação de NFC-e;
- listagem e detalhes de compras;
- filtros e exclusão controlada;
- produtos, categorias e classificação automática;
- revisão mobile de produtos;
- documentação `.md` e `.txt` na pasta `readme`.

## Alterações da v0.5.0

- nova aba **Resumo**;
- total mensal, compras, itens e ticket médio;
- comparação com o mês anterior;
- top produtos, categorias e supermercados;
- histórico de preços por produto;
- gráfico leve em SVG;
- registros de preço por mercado e data;
- supermercado selecionado por lista na tela Compras;
- campo mensal ajustado para telas pequenas.

## Banco

Migration obrigatória:

```text
database/migrations/006_dashboard_historico_precos.sql
```

A migration é aditiva em relação aos dados. Ela substitui apenas a assinatura da função de listagem de compras para receber `supermercado_id` em vez de texto livre.

## Regras importantes

- o backend deriva a família pela sessão autenticada;
- o frontend nunca envia `familia_id` para consultar dados;
- supermercados disponíveis no filtro pertencem somente à família atual;
- dashboards e históricos consultam apenas compras confirmadas da família;
- nenhuma biblioteca pesada de gráficos foi adicionada;
- nenhuma nova variável de ambiente foi criada.

## Próxima versão planejada

**v0.6.0 — Operação familiar**

Escopo sugerido:

- membros da família;
- convites;
- configurações da família;
- perfil e permissões;
- experiência de administração mobile.

## Regra de continuidade

Toda nova versão deve partir do último checkpoint validado e gerar patch ZIP real. A documentação `.md` e `.txt` deve permanecer na pasta `readme`.
