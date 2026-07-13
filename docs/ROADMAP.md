# Roadmap — Gestão de Compras Web

## v0.1.0 — Estrutura inicial

- repositório separado;
- frontend Next.js;
- backend FastAPI;
- endpoint `/health`;
- tela inicial mobile;
- estrutura PWA;
- documentação de arquitetura;
- sem alteração no banco de produção.

## v0.1.1 — Integração local

- frontend consulta `/health`;
- configuração de ambientes;
- tratamento de indisponibilidade;
- padronização de respostas da API.

## v0.2.0 — Banco e autenticação

- criar projeto Supabase;
- criar schema PostgreSQL;
- configurar migrations;
- implementar Supabase Auth;
- criar conta familiar;
- proteger endpoints.

## v0.3.0 — Prova da NFC-e

- captura de imagem no iPhone;
- envio ao FastAPI;
- leitura do QR Code;
- consulta da NFC-e;
- conferência em cards;
- ainda sem gravar compra definitiva.

## v0.4.0 — Registro de compras

- confirmar compra;
- consolidar itens idênticos;
- produtos automáticos;
- categorias;
- duplicidade de NFC-e;
- histórico de preços.

## v0.5.0 — Operação principal

- listagem de compras;
- detalhes sem modal pesado;
- produtos para revisão;
- mercados e categorias;
- manutenção controlada.

## v0.6.0 — Dashboard e histórico

- resumo mensal;
- top produtos;
- gastos por categoria;
- gastos por supermercado;
- histórico e variação de preços.

## v0.7.0 — Migração e substituição

- exportar dados do Turso;
- importar no PostgreSQL;
- conferir totais;
- testes no iPhone;
- período de uso paralelo;
- decisão sobre substituição do Streamlit.
