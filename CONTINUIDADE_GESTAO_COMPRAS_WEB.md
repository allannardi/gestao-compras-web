# Continuidade — Gestão de Compras Web

## Checkpoint em preparação

**v0.3.1 — Primeira gravação de compras**

A versão parte do checkpoint validado v0.3.0 e adiciona:

- identidade visual no primeiro card do login;
- gravação real no Supabase/PostgreSQL;
- compras e itens vinculados à família autenticada;
- criação/reutilização de supermercado e produtos;
- histórico de preços;
- bloqueio de NFC-e duplicada por família.

## Regras preservadas

- frontend Next.js na Vercel;
- backend FastAPI no Render;
- Supabase Auth e PostgreSQL;
- isolamento por `familia_id`;
- uso principal no iPhone/PWA;
- câmera traseira e upload de foto;
- projeto Streamlit v0.5.14 mantido como referência funcional.

## Próximo passo depois da validação

Criar a primeira tela de compras salvas, com cards compactos e detalhes sem modal pesado.
