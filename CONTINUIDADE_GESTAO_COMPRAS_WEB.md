# Continuidade — Gestão de Compras Web

## Baseline anterior validada

**v0.2.2 — Deploy online e prova completa da NFC-e**

Validada no desktop e iPhone, com Vercel, Render, Safari, PWA, câmera, foto e consulta da NFC-e.

## Versão atual preparada

**v0.3.0 — Fundação SaaS por Famílias**

Implementações:

- Supabase Auth;
- criar e entrar em uma família;
- família, perfil, membros, papel Administrador e configurações iniciais;
- isolamento via `familia_id` e RLS;
- função `meu_contexto()`;
- endpoint autenticado `/api/v1/auth/me`;
- NFC-e exige sessão válida;
- estrutura de convites preparada, sem tela ainda.

## Regra arquitetural definitiva

Dados de negócio pertencem à família, não a um usuário isolado.

```text
Família → Membros → Compras → Produtos → Histórico
```

As próximas tabelas de negócio devem possuir `familia_id` e políticas RLS.

## Próxima etapa após a validação

**v0.3.1 — Primeira gravação real no PostgreSQL**, mantendo o Streamlit v0.5.14 como referência funcional.
