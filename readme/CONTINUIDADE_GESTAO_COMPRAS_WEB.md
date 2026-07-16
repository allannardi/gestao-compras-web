# Continuidade — Gestão de Compras Web

## Estado atual

Último checkpoint validado: **v0.6.0 — Família, membros e convites**.

Patch preparado: **v0.6.1 — Entrada por link de convite**.

## Funcionalidades validadas até a v0.6.0

- frontend Next.js na Vercel;
- backend FastAPI no Render;
- Supabase Auth e PostgreSQL;
- famílias isoladas por `familia_id`;
- câmera, foto, QR Code e NFC-e no iPhone;
- gravação, histórico e detalhes de compras;
- ordenação de itens por valor total;
- filtros, exclusão controlada e paginação;
- produtos, categorias e classificação;
- dashboard e histórico de preços;
- seletor de mês compatível com Safari;
- configurações, membros, papéis e convites;
- contador de registros no histórico dos produtos.

## Alteração da v0.6.1

O convite agora gera um link que pode ser enviado pelo WhatsApp. Uma pessoa sem conta cria nome e senha diretamente no convite, sem criar família paralela. Uma pessoa com conta entra com a senha existente e aceita o convite.

## Banco

Migration obrigatória:

```text
database/migrations/008_fluxo_convite_com_link.sql
```

## Regra de continuidade

Toda nova versão deve partir do último checkpoint validado e gerar patch ZIP real. Documentos `.md` e `.txt` permanecem na pasta `readme`.
