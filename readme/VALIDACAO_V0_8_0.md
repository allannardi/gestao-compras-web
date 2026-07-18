# Validação técnica — v0.8.0

## Backend

```text
82 testes aprovados
```

Também foi confirmada a compilação e a versão `0.8.0` no endpoint de saúde.

## Frontend

```text
TypeScript aprovado
ESLint aprovado
Build Next.js aprovado
```

Rotas confirmadas:

```text
/
/convite/[token]
/offline
/redefinir-senha
```

## PWA

Foram verificados por código e build:

- novo cache `gestao-compras-shell-v0.8.0`;
- worker em espera até o usuário solicitar atualização;
- mensagem `SKIP_WAITING`;
- detecção de nova versão;
- orientação de instalação no iPhone;
- página offline com nova tentativa.

A validação definitiva do comportamento do service worker deve ser realizada no deploy da Vercel e no iPhone.

## Banco

Esta versão não possui migration nem altera dados.
