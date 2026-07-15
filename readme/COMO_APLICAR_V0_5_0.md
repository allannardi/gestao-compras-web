# Como aplicar — Gestão de Compras Web v0.5.0

## 1. Checkpoint de origem

Aplicar somente sobre a versão validada:

```text
v0.4.0 — Produtos e classificação
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

Não é necessário executar `npm install`, pois nenhuma dependência foi adicionada.

## 3. Migration obrigatória no Supabase

Abra:

```text
Supabase → SQL Editor → New query
```

Copie todo o conteúdo de:

```text
database\migrations\006_dashboard_historico_precos.sql
```

Cole no SQL Editor e clique em **Run**.

A migration:

- não apaga compras, itens, produtos ou históricos;
- cria as funções do dashboard;
- cria as consultas de histórico de preços;
- cria a lista segura de supermercados da família;
- altera o filtro da listagem de compras para usar `supermercado_id`;
- mantém o isolamento por `familia_id`.

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
48 passed
```

### Frontend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
npm run dev
```

Como o ambiente principal é online/mobile, os testes locais não bloqueiam o deploy quando Vercel, Render e Supabase estiverem funcionando.

## 5. Publicar no GitHub

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.5.0 - dashboard e historico de precos"
git push
```

Aguarde os deployments da Vercel e do Render. Não existem novas variáveis de ambiente.

## 6. Validação online pelo iPhone

1. Entre no aplicativo.
2. Confirme a nova opção **Resumo** na navegação.
3. Escolha um mês com compras.
4. Confira total gasto, compras, itens e ticket médio.
5. Confira a comparação com o mês anterior.
6. Confira os rankings de produtos, categorias e supermercados.
7. Busque um produto na seção Histórico de preços.
8. Abra o produto e confira menor, maior, último valor e variação.
9. Confira o gráfico e a lista de registros por supermercado.
10. Abra **Compras**.
11. Confirme que o filtro de supermercado é uma lista de opções existentes.
12. Selecione apenas um supermercado e filtre.
13. Confirme que o campo **Mês da compra** permanece dentro do card.
14. Teste os dois filtros juntos.
15. Entre com outra família e confirme que ela não vê os indicadores da primeira.

## 7. Retorno seguro

Em caso de problema antes do commit, restaure os arquivos da v0.4.0. A migration não remove dados existentes.
