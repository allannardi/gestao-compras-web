# Continuidade — v0.6.3

## Checkpoint de origem

**v0.6.2 — Senhas e segurança**, validada pelo usuário.

## Patch preparado

**v0.6.3 — UX, histórico e fundação Premium**, pendente de aplicação e validação.

## Alterações

- card de segurança movido para o fim de Ajustes;
- histórico de preços com busca e seletor compacto, sem cards individuais;
- seletor mostra último valor, quantidade de registros e categoria;
- até 200 produtos retornados pelo histórico;
- fundação interna dos planos Free e Premium;
- Free permanece com dois membros;
- Premium preparado com cinco membros por padrão e limite customizável;
- nenhuma interface comercial ou cobrança nesta etapa.

## Migration obrigatória

```text
database/migrations/010_premium_historico_filtro.sql
```

## Regra de continuidade

Todo arquivo `.md` ou `.txt` novo permanece na pasta `readme`.
A próxima versão deverá partir da v0.6.3 somente depois da validação do usuário.
