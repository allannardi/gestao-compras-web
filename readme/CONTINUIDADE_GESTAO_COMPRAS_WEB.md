# Continuidade — Gestão de Compras Web

## Último checkpoint validado

**v0.6.4 — Categorias e supermercados**

Validado pelo usuário após a gestão de categorias e supermercados.

## Patch atual

**v0.7.0 — Exportação e backup**

Pendente de aplicação e validação.

## Alterações

- nova área de exportação dentro de Ajustes;
- resumo de compras, itens, produtos e históricos;
- Excel completo com múltiplas abas;
- backup JSON por família;
- acesso restrito a administradores;
- nova dependência Python `openpyxl`;
- documentação mantida em `readme`.

## Migration obrigatória

```text
database/migrations/012_exportacao_backup.sql
```

## Regra de continuidade

A v0.7.0 somente passa a ser baseline depois da validação do usuário.
