# v1.1.0 — Mesclagem e aliases de produtos

- ação de mesclagem disponível apenas para administradores;
- seleção explícita do produto principal e do cadastro incorporado;
- prévia com compras, registros de preço, quantidade e categoria;
- transferência transacional de itens e históricos;
- tratamento de históricos coincidentes na mesma compra;
- aliases criados a partir das descrições antigas;
- reconhecimento de aliases ao registrar novas NFC-e;
- produto incorporado desativado e preservado para auditoria;
- registro de quem realizou a operação e quando;
- migration obrigatória `015_mesclagem_aliases_produtos.sql`;
- 108 testes backend aprovados;
- TypeScript, ESLint e build Next.js aprovados.
