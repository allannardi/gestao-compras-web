# Changelog — v0.9.0

## Preparação para beta

- guia inicial para administradores;
- etapas de primeira compra, revisão de produtos e convite de membro;
- guia pode ser concluído e reaberto pela área `Mais`;
- identificação visível da versão do aplicativo e da API.

## Privacidade

- nova área `Privacidade` dentro de `Mais`;
- explicação dos dados armazenados e do isolamento por família;
- acesso direto a exportação, backup e exclusão;
- registro individual de visualização das informações de privacidade.

## Exclusão segura

- exclusão da própria conta com confirmação de e-mail e senha atual;
- bloqueio quando o usuário é o único administrador de uma família com outros membros;
- famílias em que a conta é o único membro são apagadas automaticamente;
- preservação do histórico compartilhado sem manter referência à conta removida;
- exclusão da família atual somente quando ela possui um único membro e o usuário tem outra família ativa;
- chave administrativa usada somente pelo backend.

## Segurança

- nova variável de backend `SUPABASE_SECRET_KEY`;
- compatibilidade com o nome legado `SUPABASE_SERVICE_ROLE_KEY`;
- nenhuma chave administrativa é enviada ao navegador;
- reautenticação por senha antes das operações destrutivas;
- migration 013 altera referências históricas para `ON DELETE SET NULL`.

## PWA

- cache atualizado para `gestao-compras-shell-v0.9.0`;
- checkpoint visual atualizado para v0.9.0.
