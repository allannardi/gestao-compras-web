# Validação técnica — v0.6.0

## Backend

Executado:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
57 passed
```

A compilação Python foi concluída sem erros.

## Frontend

Os arquivos TypeScript e TSX foram analisados pelo compilador TypeScript em modo de transpilação, sem erros de sintaxe.

O build completo do Next.js deve ser confirmado no computador do usuário, porque a instalação das dependências npm não foi concluída no ambiente de geração deste patch.

## Migration

A migration foi revisada estaticamente. A execução real deve ser validada no SQL Editor do Supabase antes do deploy.

## Segurança

- nenhuma credencial foi incluída;
- nenhum arquivo `.env` foi incluído;
- nenhuma chave secreta foi adicionada;
- as funções RPC exigem usuário autenticado;
- operações administrativas validam o papel na família;
- a aceitação de convite valida o e-mail autenticado.
