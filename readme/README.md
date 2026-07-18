# Gestão de Compras Web

Aplicação mobile/PWA para registrar e acompanhar compras domésticas por NFC-e.

## Patch atual

**v0.9.0 — Preparação para beta**

## Checkpoint de origem

**v0.8.0 — Experiência mobile e PWA**, validada.

## Novidades

- guia inicial para administradores;
- área de privacidade e controle dos dados;
- versão visível do aplicativo e da API;
- exclusão segura da própria conta;
- exclusão controlada da família atual;
- limpeza automática de famílias sem membros;
- revisão adicional de segurança.

## Aplicação

Leia:

```text
readme\COMO_APLICAR_V0_9_0.md
```

Execute antes do deploy:

```text
database\migrations\013_preparacao_beta_privacidade.sql
```

Configure no Render:

```text
SUPABASE_SECRET_KEY
```
