# Continuidade — Gestão de Compras Web

## Último checkpoint validado

**v0.6.2 — Senhas e segurança**

Validado:

- alteração da própria senha;
- redefinição segura da senha de membros;
- mensagem completa do convite;
- famílias, convites e isolamento;
- compras, produtos, resumo e histórico;
- uso online no iPhone.

## Patch atual

**v0.6.3 — UX, histórico e fundação Premium**

Pendente de aplicação e validação.

## Alterações da v0.6.3

- card de Segurança movido para o final de Ajustes;
- produtos do histórico concentrados em um seletor;
- busca textual preservada;
- cada opção mostra último valor, registros e categoria;
- limite ampliado para até 200 produtos no seletor;
- fundação interna das licenças Free e Premium;
- Free permanece com dois membros;
- Premium preparado com cinco membros por padrão e limite customizável;
- nenhuma tela de cobrança ou alteração de licença.

## Migration obrigatória

```text
database/migrations/010_premium_historico_filtro.sql
```

## Regra de continuidade

- toda evolução parte do último checkpoint validado;
- todo patch deve ser real e incremental;
- arquivos `.md` e `.txt` novos permanecem na pasta `readme`;
- a v0.6.3 só vira baseline após validação do usuário.
