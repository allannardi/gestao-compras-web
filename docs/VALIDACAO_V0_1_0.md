# Validação da v0.1.0

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
- build de produção do Next.js concluído;
- rotas `/` e `/offline` geradas.

## Backend

Executado com sucesso:

```text
pip install -r requirements-dev.txt
pytest -q
```

Resultado:

```text
1 passed
```

## Observações

- O backend foi testado no ambiente de geração com Python 3.13.
- O projeto está configurado para utilizar Python 3.12 no desenvolvimento e deploy.
- O `npm audit` informou duas vulnerabilidades moderadas na árvore atual do Next.js/PostCSS, sem correção estável automática adequada no momento da geração.
- Não foi executado `npm audit fix --force`, para evitar downgrade ou alteração incompatível da base.
- Nenhum segredo, token, banco de dados ou nota fiscal foi incluído.
