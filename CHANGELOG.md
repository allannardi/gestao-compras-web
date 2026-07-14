# Changelog — Gestão de Compras Web

## v0.3.2 — Compras e detalhes

- adiciona migration `003_consulta_compras.sql`;
- adiciona RPC segura para listar compras da família autenticada;
- adiciona RPC segura para abrir os detalhes de uma compra;
- adiciona `GET /api/v1/compras` com paginação;
- adiciona `GET /api/v1/compras/{id}`;
- mantém o isolamento obrigatório por `familia_id`;
- retorna 404 quando a compra não pertence à família autenticada;
- adiciona navegação mobile entre `Adicionar` e `Compras`;
- lista as compras em cards compactos e em ordem decrescente;
- exibe supermercado, data, total, pagamento e quantidade de itens;
- abre os detalhes na própria página, sem modal;
- exibe os itens, quantidades, valores e categoria;
- adiciona estados de lista vazia, carregamento, erro e paginação;
- adiciona atalho `Ver minhas compras` depois de salvar uma NFC-e;
- preserva autenticação, Supabase, Vercel, Render, câmera, foto e gravação da v0.3.1.

## v0.3.1 — Primeira gravação de compras

- adiciona migration `002_compras_nfce.sql`;
- cria tabelas de compras, itens, produtos, supermercados, categorias e histórico de preços;
- registra a compra de forma atômica por RPC no PostgreSQL;
- deriva `familia_id` exclusivamente da sessão autenticada;
- bloqueia NFC-e duplicada dentro da mesma família;
- adiciona identidade visual no login.

## v0.3.0 — Fundação SaaS por Famílias

- Supabase Auth;
- criação automática de família e administrador;
- isolamento por `familia_id` e RLS;
- sessão e endpoints protegidos;
- leitura da NFC-e preservada.
