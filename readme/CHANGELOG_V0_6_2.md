# Changelog — v0.6.2

## Senhas e segurança

- adicionada a seção **Minha senha** dentro de Ajustes;
- confirmação da senha atual antes da troca;
- validação de nova senha e confirmação;
- administradores podem enviar um e-mail de redefinição para outro membro da família;
- o administrador não vê nem define diretamente a senha do membro;
- criada a página `/redefinir-senha` para o membro escolher a nova senha;
- redefinição administrativa protegida por família e papel de Administrador;
- criada a migration `009_senhas_seguranca.sql`.

## Convites

O botão de cópia agora envia a mensagem completa:

```text
Você foi convidado para participar do Gestão de Compras.

Clique no link: <link_do_convite>
```

## Preservado

- famílias e isolamento por `familia_id`;
- fluxo de convite por link;
- compras, produtos, resumo e histórico;
- Vercel, Render, Supabase e PWA no iPhone.
