# Validação técnica — v0.6.1

## Backend

Executado:

```text
pytest -q
python -m compileall -q app tests
```

Resultado:

```text
63 passed
Compilação aprovada
```

## Frontend

Executado:

```text
npm run typecheck
npm run lint
npm run build
```

Resultado:

```text
TypeScript aprovado
ESLint aprovado
Build Next.js aprovado
```

Rotas geradas:

```text
/
/convite/[token]
/offline
```

## Limite da validação

A migration `008_fluxo_convite_com_link.sql` precisa ser executada e testada no projeto Supabase real. O ambiente de geração não possui acesso às credenciais do projeto do usuário.
