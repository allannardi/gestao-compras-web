# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Checkpoint validado

**v1.0.2 — Beta UX**

## Patch atual

**v1.1.0 — Mesclagem e aliases de produtos**

Este patch permite reunir cadastros duplicados sem perder compras ou históricos.
As descrições antigas passam a funcionar como aliases nas próximas notas.

## Aplicação

Consulte:

```text
readme\COMO_APLICAR_V1_1_0.md
```

Migration obrigatória:

```text
database\migrations\015_mesclagem_aliases_produtos.sql
```

Não há dependência ou variável nova.
