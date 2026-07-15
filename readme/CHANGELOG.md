# Changelog — Gestão de Compras Web

## v0.4.0 — Produtos e classificação

- nova navegação **Produtos**;
- catálogo da família em cards mobile;
- indicadores Total, Para revisar e Classificados;
- busca por produto ou marca;
- filtros por categoria e por produtos pendentes;
- edição do nome padronizado, marca, unidade e categoria;
- edição na própria página, sem modal pesado;
- criação de categorias personalizadas;
- categorias padrão criadas para famílias existentes e futuras;
- classificação automática por palavras-chave;
- regra de Alimentos secundários para salgadinhos, bolachas, biscoitos, chips, snacks, doces, chocolates, pipoca e amendoim;
- botão **Reclassificar pendentes**;
- categorias revisadas manualmente são preservadas;
- novos produtos tentam classificação automática no primeiro cadastro;
- histórico de compras e preços continua vinculado ao mesmo produto;
- isolamento de todas as operações por `familia_id`.

## v0.3.3 — Operação do histórico — validada

- itens da conferência ordenados por valor total decrescente;
- itens dos detalhes ordenados por valor total decrescente;
- filtro por nome do supermercado;
- filtro por mês da compra;
- paginação preservando os filtros aplicados;
- exclusão controlada de compras de teste;
- confirmação obrigatória digitando `EXCLUIR`;
- exclusão disponível somente para administradores;
- atualização imediata da listagem após a exclusão;
- itens e histórico de preços relacionados removidos por cascade;
- produtos, categorias e supermercados preservados;
- documentação centralizada na pasta `readme`.

## v0.3.2 — Compras e detalhes — validada

- navegação Adicionar / Compras;
- listagem em cards mobile;
- paginação;
- detalhes na própria página;
- consultas isoladas por família.

## v0.3.1 — Primeira gravação — validada

- identidade visual no login;
- gravação real de compras e itens;
- produtos, supermercados e histórico automáticos;
- bloqueio de duplicidade.

## v0.3.0 — Fundação SaaS por Famílias — validada

- Supabase Auth;
- famílias e administradores;
- isolamento por `familia_id`;
- câmera e consulta de NFC-e preservadas.
