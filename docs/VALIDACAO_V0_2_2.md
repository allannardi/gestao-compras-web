# Validação técnica — v0.2.2

## Backend

Executado:

```text
pytest -q
```

Resultado:

```text
6 passed
```

Validações incluídas:

- saúde da API;
- endpoint de prévia da NFC-e;
- leitura e extração da chave;
- rejeição de arquivos inválidos;
- normalização das origens CORS;
- versão centralizada da API.

## Frontend

Executado:

```text
npm run typecheck
npm run lint
npm run build
```

Resultado:

- TypeScript sem erros;
- ESLint sem erros;
- build de produção concluído;
- rotas `/` e `/offline` geradas.

## Deploy

- `render.yaml` preparado para o backend;
- Python 3.12.13 fixado no Render;
- plano inicial do serviço configurado como Free;
- frontend preparado para receber a URL pública da API pela Vercel;
- nenhum segredo ou arquivo local foi incluído.
