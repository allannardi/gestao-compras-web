# Como aplicar — v0.6.4

## 1. Origem

Este patch deve ser aplicado sobre o checkpoint validado:

```text
v0.6.3 — UX, histórico e fundação Premium
```

## 2. Extrair

Extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Preserve:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

Não é necessário executar `npm install`.

## 3. Migration obrigatória

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\011_categorias_supermercados.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration não apaga compras, produtos ou históricos.

## 4. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.6.4 - categorias e supermercados"
git push
```

Não existem novas variáveis de ambiente.

## 5. Testes no iPhone

### Categorias

1. Abra `Cadastros`.
2. Confirme os indicadores.
3. Crie uma categoria personalizada.
4. Altere seu nome.
5. Desative-a escolhendo uma categoria de destino.
6. Confirme que os produtos foram preservados.
7. Reative a categoria.
8. Confirme que categorias do sistema não exibem ações destrutivas.

### Supermercados

1. Abra a aba `Supermercados`.
2. Confira quantidade de compras, total e última compra.
3. Corrija o nome de um supermercado.
4. Em um cadastro elegível, teste `Unir cadastro`.
5. Confirme que as compras e o histórico foram movidos.
6. Confira Compras, Resumo e Histórico de preços.

## Regra de união

A união automática só é habilitada quando o supermercado de origem possui CNPJ e o destino está sem CNPJ ou possui o mesmo CNPJ. Isso evita que futuras NFC-e recriem o cadastro antigo.
