# Roadmap — Gestão de Compras Web

## v0.1.0 — Estrutura inicial

- repositório separado;
- frontend Next.js;
- backend FastAPI;
- endpoint `/health`;
- tela inicial mobile;
- estrutura PWA;
- sem alteração no banco de produção.

## v0.1.1 — Integração local validada

- frontend e backend funcionando no Windows;
- status `API conectada`;
- correção do registro público do npm;
- primeiro commit no repositório `gestao-compras-web`.

## v0.2.0 — Prova inicial da NFC-e

- câmera web com preferência pela câmera traseira;
- alternativa por foto já tirada;
- envio de imagem ao FastAPI;
- leitura do QR Code;
- consulta da página pública da NFC-e;
- conferência mobile em cards;
- consolidação de itens idênticos;
- nenhuma gravação em banco.

## v0.2.1 — Correção da câmera

- associação reativa do `MediaStream` ao vídeo;
- captura liberada somente após o primeiro quadro;
- câmera local validada.

## v0.2.2 — Deploy online e validação no iPhone

- backend preparado para Render;
- frontend preparado para Vercel;
- CORS de produção configurável;
- status da API com tentativa manual de reconexão;
- HTTPS para permitir câmera no Safari;
- teste pelo navegador e pelo atalho da tela inicial.

## v0.3.0 — Banco e autenticação

- criar projeto Supabase;
- criar schema PostgreSQL;
- configurar migrations;
- implementar Supabase Auth;
- criar conta familiar;
- proteger endpoints.

## v0.4.0 — Registro de compras

- confirmar compra;
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
- período de uso paralelo;
- decisão sobre substituição do Streamlit.
