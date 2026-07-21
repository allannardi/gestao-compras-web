# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Checkpoint validado

**v1.1.0 — Mesclagem e aliases de produtos**

## Patch atual

**v1.2.0 — Fundação do Admin Geral**

O patch cria um painel operacional global para famílias, usuários e auditoria,
sem implementar plano Premium ou cobrança. Inclui suspensão, reativação e
exclusões definitivas com confirmação reforçada.

## Aplicação

Consulte:

```text
readme\COMO_APLICAR_V1_2_0.md
```

Migration obrigatória:

```text
database\migrations\016_admin_geral.sql
```

Não há dependência ou variável de ambiente nova.
