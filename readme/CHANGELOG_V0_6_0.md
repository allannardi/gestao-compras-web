# Changelog — v0.6.0

## Configurações da família

- nova área **Ajustes**;
- edição do nome do usuário;
- edição do nome da família por administradores;
- exibição do plano, limite e ocupação da família;
- suporte a mais de uma família por usuário;
- troca da família atual.

## Membros e convites

- lista de membros;
- papéis Administrador e Membro;
- criação de convite por e-mail;
- lista de convites pendentes;
- cancelamento de convite;
- aceitação de convite pelo e-mail autenticado;
- alteração de papel;
- remoção controlada de membros;
- proteção para manter ao menos um administrador.

## Autenticação

- fluxo preparado para cadastro sem confirmação por e-mail;
- mensagem específica quando `Confirm email` ainda estiver ativo no Supabase;
- configuração documentada no guia da versão.

## Histórico de preços

- cada card de produto agora mostra a quantidade de registros de preço.

## Segurança

- todas as operações usam o JWT atual;
- a família é determinada no banco;
- convites só podem ser criados e cancelados por administradores;
- convites só podem ser aceitos pelo mesmo e-mail cadastrado;
- troca de família exige vínculo ativo;
- dados continuam isolados por `familia_id`.
