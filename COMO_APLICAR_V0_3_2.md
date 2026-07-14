# Como aplicar — Gestão de Compras Web v0.3.2

## 1. Base obrigatória

Aplique este patch somente sobre o checkpoint validado:

```text
v0.3.1 — Primeira gravação de compras
```

## 2. Extrair o patch

Pare os terminais, se estiverem abertos, e extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

O patch não inclui nem substitui:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

## 3. Executar a migration

No Supabase, abra:

```text
SQL Editor → New query
```

Copie todo o conteúdo de:

```text
database\migrations\003_consulta_compras.sql
```

Cole e clique em `Run`.

A migration cria somente as funções de consulta:

```text
listar_compras_familia
detalhar_compra_familia
```

Ela não apaga nem altera as compras já gravadas.

## 4. Validação local opcional

### Backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
uvicorn app.main:app --reload --port 8000
```

Resultado esperado:

```text
23 passed
```

O health check deverá indicar:

```text
version: 0.3.2
```

### Frontend

Não há novas dependências JavaScript. Não é necessário executar `npm install`.

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
npm run dev
```

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.3.2 - adiciona compras e detalhes mobile"
git push
```

Aguarde os deployments da Vercel e do Render. Não há novas variáveis de ambiente.

Caso o novo código não apareça imediatamente, faça o deploy manual da Vercel e do Render, como nos checkpoints anteriores.

## 6. Checklist online no iPhone

1. Entre no aplicativo.
2. Confirme a navegação `Adicionar` e `Compras`.
3. Abra `Compras`.
4. Confirme que as compras aparecem em ordem da mais recente para a mais antiga.
5. Confira supermercado, data, valor, pagamento e quantidade de itens.
6. Abra `Ver detalhes`.
7. Confirme que os detalhes aparecem na própria página, sem modal.
8. Confira todos os itens, quantidades, unidades, valores e categorias.
9. Volte para a listagem.
10. Salve uma nova NFC-e.
11. Toque em `Ver minhas compras`.
12. Confirme que a compra nova aparece no topo.
13. Entre com a segunda família e confirme que ela não vê compras da primeira.

## 7. Observação

A exclusão de compras não foi incluída nesta versão. Ela será tratada separadamente com confirmação e proteção apropriadas.
