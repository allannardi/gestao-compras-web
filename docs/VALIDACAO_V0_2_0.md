# Validação técnica — v0.2.0

## Backend

Foram executados:

```text
pytest -q
python -m compileall app tests
```

Resultado:

```text
5 passed
```

Foram validados:

- endpoint de saúde;
- extração da chave de 44 dígitos;
- rejeição de arquivo que não seja imagem;
- resposta estruturada da prévia da NFC-e;
- compilação dos módulos Python.

## Frontend

Os arquivos TypeScript/TSX foram verificados pelo compilador TypeScript
em modo de transpilação, sem erros de sintaxe.

O build completo do Next.js deve ser confirmado no computador do usuário,
porque este patch não inclui `node_modules` nem altera o `package-lock.json`.

## Segurança e escopo

- nenhuma credencial foi incluída;
- nenhum arquivo `.env` foi incluído;
- nenhum banco foi incluído;
- nenhuma compra é gravada nesta versão;
- uploads são limitados a 12 MB;
- somente JPG, PNG e WEBP são aceitos;
- URLs privadas e locais são bloqueadas na consulta do backend.
