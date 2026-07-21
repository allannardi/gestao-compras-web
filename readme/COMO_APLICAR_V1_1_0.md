# Como aplicar — v1.1.0 Mesclagem e aliases de produtos

## Objetivo

Esta versão permite que administradores reúnam dois cadastros que representam o
mesmo produto. Compras, itens e históricos de preço passam a apontar para o
produto principal. As descrições antigas são guardadas como aliases para que as
próximas NFC-e reutilizem o produto correto.

## 1. Extrair o patch

Extraia o conteúdo do ZIP sobre a raiz do projeto:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Preserve os arquivos e pastas locais:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

## 2. Executar a migration obrigatória

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\015_mesclagem_aliases_produtos.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration:

- cria aliases de produtos;
- cria auditoria das mesclagens;
- prepara aliases com descrições já existentes nas compras;
- adiciona funções protegidas para listar candidatos e mesclar;
- atualiza o registro de novas compras para reconhecer aliases;
- não exclui compras nem históricos existentes.

## 3. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v1.1.0 - mesclagem e aliases de produtos"
git push
```

Não existem dependências ou variáveis de ambiente novas. Não é necessário
executar `npm install`.

## 4. Como usar

1. Entre como administrador da família.
2. Abra **Produtos**.
3. No produto que deverá permanecer, toque em **Mesclar com outro produto**.
4. Pesquise e selecione o cadastro duplicado.
5. Confira compras, registros de preço, quantidade e categoria dos dois lados.
6. Marque a confirmação.
7. Toque em **Confirmar mesclagem**.

O primeiro produto é o principal. Nome, marca, unidade e categoria dele são
mantidos. O segundo cadastro deixa de aparecer na lista.

## 5. Regras de segurança

- somente administradores podem mesclar;
- os dois produtos precisam pertencer à mesma família;
- os produtos precisam ter a mesma unidade nesta primeira versão;
- não é possível mesclar um produto com ele mesmo;
- a operação ocorre em uma transação no Supabase;
- a origem da mesclagem, o usuário e as quantidades transferidas ficam auditados;
- o produto incorporado é desativado, não apagado fisicamente;
- descrições anteriores passam a reconhecer automaticamente o produto principal.

## 6. Teste recomendado

Use dois produtos duplicados que tenham poucos registros:

1. Anote os números de compras e históricos de ambos.
2. Escolha qual nome, marca e categoria devem permanecer.
3. Abra a mesclagem a partir desse produto principal.
4. Selecione o duplicado e confirme.
5. Verifique que apenas o principal continua na lista.
6. Abra o Histórico de preços e confira os registros reunidos.
7. Registre uma nova NFC-e com a descrição antiga do duplicado.
8. Confirme que um novo cadastro não foi criado.

A mesclagem não possui desfazer automático nesta versão. Faça o primeiro teste
com produtos de baixo risco e confirme cuidadosamente qual cadastro será mantido.
