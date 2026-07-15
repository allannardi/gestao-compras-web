# Gestão de Compras Web v0.5.2 — Seletor de mês no iPhone

## Objetivo

Substituir os campos nativos `input type="month"`, que ultrapassavam os cards no Safari/iPhone, por seletores de mês controlados pelo aplicativo.

A correção se aplica a:

- filtro **Mês da compra** na aba Compras;
- filtro **Mês do resumo** na aba Resumo.

## Aplicação

Extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

## Banco e dependências

Esta versão não possui:

- migration;
- nova dependência;
- nova variável de ambiente;
- alteração funcional no banco.

Não é necessário executar `npm install`.

## Publicação

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.5.2 - substitui seletor de mes no iPhone"
git push
```

## Validação no iPhone

1. Abra **Compras**.
2. Confirme que o seletor **Mês da compra** está totalmente dentro do card.
3. Selecione um mês e aplique o filtro.
4. Use **Todos os meses** para limpar apenas o período.
5. Abra **Resumo**.
6. Confirme que o seletor **Mês do resumo** está totalmente dentro do card.
7. Selecione outro mês e atualize o resumo.
