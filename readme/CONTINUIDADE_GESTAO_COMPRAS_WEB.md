# Continuidade — Gestão de Compras Web

## Último checkpoint validado

**v0.6.3 — UX, histórico e fundação Premium**

## Patch atual

**v0.6.4 — Categorias e supermercados**

Pendente de aplicação e validação.

## Alterações

- área Cadastros acessível no card superior;
- gestão de categorias personalizadas;
- transferência segura dos produtos ao desativar;
- reativação de categorias;
- listagem e correção dos supermercados;
- união de duplicidades quando o CNPJ permite preservar futuras NFC-e;
- operações destrutivas restritas a administradores;
- documentação nova mantida em `readme`.

## Migration obrigatória

```text
database/migrations/011_categorias_supermercados.sql
```

## Regra de continuidade

A v0.6.4 somente passa a ser baseline depois da validação do usuário.
