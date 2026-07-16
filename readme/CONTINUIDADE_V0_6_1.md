# Continuidade — v0.6.1

## Checkpoint de origem

**v0.6.0 — Família, membros e convites**, validada pelo usuário.

## Patch atual

**v0.6.1 — Entrada por link de convite**, pendente de aplicação e validação.

## Problema resolvido

Na v0.6.0, uma pessoa nova convidada ainda não possuía senha e não havia um caminho adequado de criação de acesso. Não deve ser orientada a usar **Criar minha família**, pois isso criaria uma família pessoal desnecessária.

## Novo fluxo

```text
Administrador cria convite
→ copia link
→ envia pelo WhatsApp
→ convidado abre /convite/[token]
→ cria nome e senha ou entra com conta existente
→ entra diretamente na família convidante
```

## Migration

```text
database/migrations/008_fluxo_convite_com_link.sql
```

## Regras preservadas

- isolamento por `familia_id`;
- autenticação Supabase;
- limite de membros;
- papéis Administrador/Membro;
- proteção para manter administrador;
- Vercel, Render, PWA e iPhone;
- compras, produtos, dashboard e histórico.

## Próximo passo após validação

Retomar o roadmap com gestão completa de categorias e supermercados ou exportação/backup, conforme prioridade do usuário.
