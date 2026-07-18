# Continuidade — v0.6.2

## Checkpoint de origem

**v0.6.1.1 — Fluxo de convite e correção da migration**, validada pelo usuário.

## Patch atual

**v0.6.2 — Senhas e segurança**, pendente de aplicação e validação.

## Recursos adicionados

- alteração da própria senha dentro de Ajustes;
- confirmação da senha atual;
- redefinição segura de senha de membro por e-mail;
- página `/redefinir-senha`;
- controle administrativo por família;
- mensagem completa de convite pronta para WhatsApp.

## Migration

```text
database/migrations/009_senhas_seguranca.sql
```

## Configuração externa obrigatória

Adicionar a URL de recuperação em **Supabase Auth → URL Configuration → Redirect URLs**:

```text
https://gestao-compras-web.vercel.app/redefinir-senha
```

## Regras de segurança

- o administrador nunca vê a senha do membro;
- o administrador não define diretamente a nova senha;
- somente administrador da família atual pode disparar o e-mail;
- o próprio membro escolhe a nova senha no link seguro;
- a própria senha exige confirmação da senha atual.

## Próximo passo após validação

Retomar o roadmap de categorias/supermercados, exportação e preparação para beta, conforme a prioridade definida pelo usuário.
