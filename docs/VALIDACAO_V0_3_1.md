# Validação técnica — v0.3.1

## Backend

Executado:

```text
pytest -q
python -m compileall app
```

Resultado:

```text
16 passed
Python compile OK
```

Cobertura principal:

- autenticação obrigatória;
- contexto da família;
- criação de compra;
- envio do JWT ao Supabase;
- validação do payload;
- mapeamento de NFC-e duplicada para HTTP 409;
- preservação dos testes da câmera/preview no backend.

## Frontend

Todos os arquivos TypeScript/TSX foram processados pelo compilador TypeScript em modo de transpilação, sem erros de sintaxe.

O build completo do Next.js deve ser confirmado no computador do usuário com as dependências já instaladas:

```text
npm run typecheck
npm run lint
npm run build
```

## Banco

A migration `002_compras_nfce.sql` foi revisada para:

- derivar `familia_id` de `auth.uid()`;
- executar a gravação em uma única função transacional;
- bloquear duplicidade da chave NFC-e dentro da família;
- habilitar RLS para leitura isolada;
- impedir escrita anônima ou escrita direta pelo frontend.

A execução definitiva do SQL será validada no projeto Supabase do usuário.
