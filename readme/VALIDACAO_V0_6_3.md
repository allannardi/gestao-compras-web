# Validação técnica — v0.6.3

## Frontend

Executado com sucesso:

```text
npm install
npm run typecheck
npm run lint
npm run build
```

Resultado:

- TypeScript sem erros;
- ESLint sem erros;
- build de produção concluído;
- rotas existentes preservadas.

## Backend

Executado com sucesso:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
66 passed
```

## Migration

A migration foi revisada estaticamente, mas precisa ser executada e validada no
Supabase real pelo usuário.

## Segurança

- o administrador da família não recebe acesso para alterar a própria licença;
- a função de alteração da licença fica reservada ao `service_role` e ao SQL Editor;
- nenhuma chave secreta foi adicionada;
- nenhuma variável de ambiente nova foi criada.
