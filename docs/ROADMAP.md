# Roadmap — Gestão de Compras Web

## v0.1.x — Fundação local — Validada

- Next.js e FastAPI;
- conexão local;
- correção do npm.

## v0.2.x — NFC-e online — Validada

- câmera e foto;
- leitura e consulta da NFC-e;
- correção da tela preta;
- Vercel + Render;
- validação no iPhone e PWA.

## v0.3.0 — Fundação SaaS por Famílias — Atual

- Supabase Auth;
- criar família;
- primeiro membro Administrador;
- sessão persistente;
- RLS e isolamento por `familia_id`;
- contexto `/api/v1/auth/me`;
- NFC-e protegida por login;
- nenhuma compra gravada ainda.

## v0.3.1 — Primeira gravação

- schema de compras, itens, produtos, categorias e supermercados;
- salvar a compra no PostgreSQL;
- impedir duplicidade por família;
- histórico de preços inicial.

## v0.3.2 — Operação principal

- listar compras da família;
- detalhes em cards;
- produtos para revisão;
- categorias e mercados.

## v0.3.3 — Membros e convites

- tela da família;
- convidar membro;
- aceitar convite;
- limites do plano Free.

## v0.4.0 — Dashboard e histórico

- resumo mensal;
- gastos por categoria e supermercado;
- top produtos;
- variação de preços.
