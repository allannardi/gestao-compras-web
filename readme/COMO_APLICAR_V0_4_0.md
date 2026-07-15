# Como aplicar — Gestão de Compras Web v0.4.0

## 1. Checkpoint de origem

Aplicar somente sobre a versão validada:

```text
v0.3.3 — Operação do histórico
```

## 2. Extrair o patch

Pare os terminais, quando estiverem abertos, e extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

O patch não contém nem substitui:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

Não é necessário executar `npm install`, pois não há nova dependência JavaScript.

## 3. Migration obrigatória no Supabase

Abra:

```text
Supabase → SQL Editor → New query
```

Copie todo o conteúdo de:

```text
database\migrations\005_produtos_classificacao.sql
```

Cole no SQL Editor e clique em **Run**.

A migration:

- não apaga compras, produtos ou históricos;
- cria categorias padrão para famílias existentes;
- prepara categorias padrão para novas famílias;
- cria as funções seguras de produtos e categorias;
- adiciona classificação automática para novos produtos;
- permite reclassificar somente os produtos ainda pendentes.

## 4. Testes técnicos opcionais

### Backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
uvicorn app.main:app --reload --port 8000
```

Resultado esperado:

```text
37 passed
```

### Frontend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
npm run dev
```

Como o ambiente principal é online/mobile, estes testes locais não bloqueiam o deploy quando Vercel, Render e Supabase estiverem funcionando.

## 5. Publicar no GitHub

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.4.0 - produtos e classificacao mobile"
git push
```

Aguarde os deployments da Vercel e do Render. Não existem novas variáveis de ambiente.

## 6. Validação online pelo iPhone

1. Entre no aplicativo.
2. Confirme a nova opção **Produtos** na navegação.
3. Abra Produtos e confira os indicadores.
4. Use o filtro **Mostrar somente produtos para revisar**.
5. Busque um produto pelo nome.
6. Filtre por uma categoria.
7. Edite um produto na própria página.
8. Altere nome, marca, unidade e categoria.
9. Salve e confirme que ele sai da revisão quando recebe categoria válida.
10. Crie uma categoria personalizada.
11. Clique em **Reclassificar pendentes**.
12. Confirme que categorias já revisadas não são alteradas.
13. Salve uma nova NFC-e com itens reconhecíveis, como arroz, leite ou detergente.
14. Confirme que novos produtos tentam receber categoria automaticamente.
15. Abra os detalhes de uma compra e confira a categoria atualizada.
16. Entre com outra família e confirme que ela não vê os produtos da primeira.

## 7. Retorno seguro

Em caso de problema antes do commit, restaure os arquivos da v0.3.3. A migration é aditiva e não remove dados existentes.
