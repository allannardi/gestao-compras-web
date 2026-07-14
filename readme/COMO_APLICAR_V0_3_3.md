# Como aplicar — Gestão de Compras Web v0.3.3

## 1. Checkpoint de origem

Aplicar somente sobre a **v0.3.2 validada**.

## 2. Extrair o patch

Pare frontend e backend, depois extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

O patch não contém:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

Toda a documentação desta versão está em:

```text
readme\
```

## 3. Executar a migration obrigatória

No Supabase:

```text
SQL Editor → New query
```

Copie e execute todo o conteúdo de:

```text
database\migrations\004_operacao_historico.sql
```

A migration:

- adiciona filtros por supermercado e mês;
- ordena os itens dos detalhes por valor total decrescente;
- cria a exclusão controlada de compras de teste;
- não apaga nenhuma compra durante a instalação.

## 4. Validar o backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
uvicorn app.main:app --reload --port 8000
```

Resultado esperado:

```text
29 passed
```

O endpoint `/health` deve informar a versão `0.3.3`.

## 5. Validar o frontend

Não existem novas dependências JavaScript.

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
npm run dev
```

## 6. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.3.3 - operacao do historico e ordenacao por valor"
git push
```

Não existem novas variáveis de ambiente.

Aguarde os deployments da Vercel e do Render. Caso um deles não atualize automaticamente, faça o deploy manual já validado nas versões anteriores.

## 7. Checklist online no iPhone

1. Ler uma NFC-e.
2. Confirmar que os itens aparecem do maior para o menor valor total.
3. Salvar a compra.
4. Abrir **Compras**.
5. Filtrar pelo nome do supermercado.
6. Filtrar pelo mês.
7. Carregar mais compras e confirmar que o filtro continua aplicado.
8. Abrir os detalhes e conferir a mesma ordenação decrescente.
9. Em uma compra de teste, tocar em **Excluir compra de teste**.
10. Digitar `EXCLUIR` e confirmar.
11. Confirmar que a compra desaparece imediatamente da listagem.
12. Conferir no Supabase que `itens_compra` e `historico_precos` relacionados foram removidos.
13. Confirmar que produtos, categorias e supermercado permaneceram cadastrados.
14. Entrar como membro comum e confirmar que a opção de exclusão não aparece.

## Atenção

A exclusão é física e irreversível. Utilize-a somente para compras de teste ou registros realmente incorretos.
