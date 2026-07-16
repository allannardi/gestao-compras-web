# Changelog — v0.6.1

## Entrada por convite

- link copiável gerado ao criar convite;
- botão **Copiar link** em convites pendentes;
- novo token ao regenerar o link, invalidando o anterior;
- rota pública `/convite/[token]`;
- apresentação da família, e-mail, papel e validade;
- criação de nome e senha para usuário novo;
- login para usuário já existente;
- entrada direta na família compartilhada;
- nenhuma família paralela criada pelo cadastro via convite;
- aceitação automática no cadastro novo;
- aceitação autenticada por token para conta existente;
- mensagens para link inválido, expirado, cancelado ou utilizado.

## Segurança

- token aleatório de 256 bits;
- apenas hash SHA-256 armazenado;
- validade de sete dias;
- vínculo obrigatório com o e-mail convidado;
- endpoints públicos limitados à consulta por token.
