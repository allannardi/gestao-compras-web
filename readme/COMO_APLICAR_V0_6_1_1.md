# COMO APLICAR — v0.6.1.1

## Correção

Este hotfix corrige o erro PostgreSQL:

```text
record variable cannot be part of multiple-item INTO list
```

A função `consultar_convite_publico` tentava preencher uma variável `%ROWTYPE`
junto com duas variáveis escalares no mesmo `INTO`. A consulta foi separada em
duas etapas compatíveis com PL/pgSQL.

## Situação da execução anterior

A migration 008 começa com `BEGIN` e termina com `COMMIT`. Como ocorreu erro antes
do `COMMIT`, a execução anterior não deve ser considerada concluída.

## Como aplicar

1. Extraia este ZIP sobre a raiz do projeto.
2. Confirme a substituição de:

```text
database\migrations\008_fluxo_convite_com_link.sql
```

3. Volte ao SQL Editor do Supabase.
4. Apague o conteúdo da query que falhou.
5. Copie novamente TODO o conteúdo do arquivo corrigido.
6. Clique em `Run`.
7. O resultado esperado é `Success. No rows returned`.

Não clique em `Debug with Assistant`, porque a correção já foi determinada e
está incluída neste hotfix.
