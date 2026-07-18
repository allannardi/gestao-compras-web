# Changelog — v0.7.0

## Exportação

- nova área `Exportação e backup` dentro de Ajustes;
- acesso restrito a administradores da família;
- resumo com compras, itens, produtos e registros de preço;
- período disponível e total confirmado;
- download de Excel completo;
- download de backup técnico em JSON.

## Excel

O arquivo possui abas organizadas:

- Resumo;
- Membros;
- Compras;
- Itens;
- Produtos;
- Histórico preços;
- Supermercados;
- Categorias.

As planilhas incluem cabeçalhos, filtros, congelamento da primeira linha, formatos de data, quantidade e moeda.

## Backup

- formato identificado como `gestao-compras-backup`;
- versão de schema registrada;
- família, configurações, membros e dados operacionais;
- nenhuma restauração automática nesta versão;
- nenhuma gravação ou exclusão durante a geração.

## Segurança

- o `familia_id` é obtido pela sessão autenticada;
- membros comuns não conseguem exportar o conjunto completo;
- o SQL e o backend validam o papel de administrador;
- os arquivos são gerados somente quando solicitados.
