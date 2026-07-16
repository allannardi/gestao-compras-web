# v0.6.1 — Entrada por link de convite

- link copiável para convite;
- página dedicada para usuário novo ou existente;
- criação de senha sem família paralela;
- token com hash, expiração e uso controlado;
- aceitação automática ou autenticada.

# v0.5.1 — Correção mobile do filtro de mês

- Corrige overflow do campo Mês da compra no Safari/iPhone.
- Mantém todos os recursos da v0.5.0.
- Sem migration ou novas dependências.

# Changelog — Gestão de Compras Web

## v0.5.0 — Dashboard e histórico de preços

- nova opção **Resumo** na navegação principal;
- resumo mensal com total gasto, quantidade de compras, itens e ticket médio;
- comparação com o mês anterior;
- ranking dos produtos com maior valor total;
- gastos por categoria;
- gastos por supermercado;
- visualização em cards e barras leves, sem biblioteca pesada de gráficos;
- busca de produtos com histórico de preços;
- indicadores de menor, maior, primeiro e último valor unitário;
- variação percentual por produto;
- gráfico leve em SVG para evolução do preço;
- lista dos registros por data e supermercado;
- filtro de supermercado na tela Compras alterado para seleção de uma opção existente;
- campo **Mês da compra** ajustado para permanecer dentro do card no mobile;
- isolamento de todos os indicadores e históricos por `familia_id`.

## v0.4.0 — Produtos e classificação — validada

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
- regra de Alimentos secundários;
- botão **Reclassificar pendentes**;
- categorias revisadas manualmente preservadas;
- isolamento das operações por `familia_id`.

## v0.3.3 — Operação do histórico — validada

- itens da conferência e dos detalhes por valor total decrescente;
- filtros mobile;
- exclusão controlada de compras de teste;
- documentação centralizada na pasta `readme`.

## v0.3.2 — Compras e detalhes — validada

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
