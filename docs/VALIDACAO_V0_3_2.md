# Validação técnica — v0.3.2

## Backend

Executado:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
23 passed
Compilação Python aprovada
```

Foram cobertos:

- autenticação obrigatória;
- listagem paginada;
- envio do token ao Supabase;
- detalhes com itens;
- resposta 404 para compra não pertencente à família;
- preservação da gravação e bloqueio de duplicidade.

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
Build de produção aprovado
```

Rotas geradas:

```text
/
/offline
```

## Segurança

- `familia_id` não é recebido do frontend para consultas;
- a família é derivada da sessão autenticada no PostgreSQL;
- a função de detalhes retorna erro quando a compra não pertence à família;
- nenhuma chave secreta foi incluída no patch.
