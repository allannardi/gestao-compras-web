# Validação técnica — v0.5.0

## Backend

Executado:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
48 passed
```

Cobertura adicionada:

- dashboard autenticado;
- mês do resumo;
- supermercados da família;
- busca de produtos com histórico;
- detalhe do histórico de preço;
- isolamento de produto de outra família;
- envio do token e parâmetros aos RPCs do Supabase;
- novo filtro por `supermercado_id`.

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

- `familia_id` continua derivado da sessão autenticada;
- o frontend não escolhe a família das consultas;
- supermercados e produtos são validados dentro da família;
- funções SQL usam `security definer` e associação ativa do usuário;
- nenhuma credencial ou arquivo `.env` foi incluído;
- nenhuma dependência JavaScript nova foi adicionada;
- a migration não exclui dados existentes.

## Migration

O arquivo SQL foi revisado estaticamente durante a geração do patch. A execução real deve ser confirmada no SQL Editor do Supabase antes do deploy.
