# Validação técnica — v0.3.3

## Backend

Executado:

```text
pytest -q
python -m compileall -q app tests
```

Resultado:

```text
29 passed
compilação aprovada
```

Cobertura funcional incluída:

- autenticação obrigatória;
- filtros encaminhados ao banco;
- exclusão bloqueada para membros;
- confirmação obrigatória;
- exclusão aprovada para administrador;
- chamadas RPC e payloads validados.

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

## Banco

A migration `004_operacao_historico.sql` foi revisada para:

- preservar o isolamento por família;
- exigir administrador para exclusão;
- exigir a confirmação `EXCLUIR`;
- remover itens e histórico por cascade;
- preservar produtos, categorias e supermercados.

A execução real no Supabase deve ser validada pelo usuário antes do deploy online.
