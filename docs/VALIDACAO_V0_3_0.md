# Validação técnica — v0.3.0

## Backend

Executado no ambiente de geração:

```text
python -m compileall app tests
pytest -q
```

Resultado:

```text
10 passed
```

Foram validados:

- endpoint de saúde;
- normalização de CORS;
- detecção de configuração do Supabase;
- login obrigatório em `/api/v1/auth/me`;
- retorno do contexto de família;
- login obrigatório na prévia da NFC-e;
- arquivo inválido;
- prévia da NFC-e autenticada;
- extração da chave de 44 dígitos.

## Frontend

Executado com instalação limpa, sem reutilizar `package-lock.json`:

```text
npm install
npm run typecheck
npm run lint
npm run build
```

Resultados:

- TypeScript aprovado;
- ESLint aprovado;
- build Next.js 16.2.10 aprovado;
- rotas `/` e `/offline` geradas.

## Banco

A migration foi revisada para:

- criação automática de família e administrador;
- RLS por `familia_id`;
- helpers em schema privado;
- RPC autenticada `meu_contexto()`;
- proteção contra troca do perfil para uma família sem vínculo.

A execução real da migration e o fluxo completo de cadastro dependem do projeto
Supabase do usuário e fazem parte do checklist de validação local/online.

## Limites desta versão

- nenhuma compra é gravada;
- convites ainda não possuem interface;
- não há migração do Turso;
- execute o SQL antes de criar o primeiro usuário.
