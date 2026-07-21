# Changelog — v1.2.0

## Admin Geral

- perfil global separado de Administrador Geral;
- rota protegida `/admin-geral`;
- acesso pelo menu Mais somente para usuários autorizados;
- dashboard com contagens globais;
- busca e detalhamento de famílias;
- busca e detalhamento de usuários;
- consulta de auditoria administrativa;
- interface responsiva para celular e computador.

## Gestão de famílias

- edição de nome e observação administrativa;
- suspensão e reativação;
- bloqueio das APIs normais para famílias suspensas;
- alteração de papéis dos membros;
- remoção de vínculo de membro;
- exclusão definitiva da família com dupla confirmação.

## Gestão de usuários

- consulta dos vínculos familiares;
- envio de redefinição de senha;
- exclusão definitiva pelo Supabase Auth;
- proteção do próprio Administrador Geral;
- bloqueio da exclusão do único administrador de uma família com outros membros.

## Auditoria e privacidade

- registro de ações sensíveis;
- ator, alvo, data, resumo, dados anteriores e novos;
- endereço técnico e identificador da requisição quando disponíveis;
- painel não exibe produtos comprados, preços ou detalhes de notas fiscais.

## Fora do escopo

- planos Free e Premium;
- cobrança e assinaturas;
- limites comerciais;
- acesso detalhado aos dados particulares das compras;
- login como outro usuário.
