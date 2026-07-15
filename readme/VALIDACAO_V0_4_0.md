# Validação técnica — v0.4.0

## Backend

Executado:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
37 passed
```

Cobertura funcional adicionada:

- listagem de produtos com filtros;
- atualização de produto;
- categorias;
- reclassificação;
- autenticação obrigatória;
- envio do token ao Supabase;
- tratamento de produto não encontrado.

## Frontend

Executado:

```text
npm run typecheck
npm run lint
npm run build
```

Resultado:

- TypeScript aprovado;
- ESLint aprovado;
- build de produção aprovado;
- rotas `/` e `/offline` geradas.

## Segurança e continuidade

- `familia_id` é derivado da sessão autenticada;
- nenhum endpoint aceita a família pelo frontend;
- funções SQL verificam a associação ativa do usuário;
- categorias revisadas não são sobrescritas pela reclassificação;
- migration aditiva, sem remoção de dados;
- nenhuma credencial ou arquivo `.env` incluído.
