# Changelog — v0.8.0

## Experiência mobile

- navegação principal reorganizada em cinco ações;
- barra fixa no rodapé do iPhone, respeitando a área segura;
- ação central `Adicionar` destacada;
- nova área `Mais` para Cadastros, Ajustes, atualização e saída;
- ações superiores mantidas no desktop.

## Conexão com o backend

- tentativas automáticas enquanto o Render desperta;
- mensagens diferentes para conexão inicial, servidor iniciando e espera prolongada;
- nova tentativa automática quando a internet retorna;
- diferenciação entre falta de internet e backend indisponível.

## Sessão

- respostas 401 da API encerram somente a sessão local;
- usuário retorna ao login com a mensagem `Sua sessão expirou`;
- nenhuma ação precisa continuar usando token inválido.

## PWA

- aviso de nova versão disponível;
- atualização controlada pelo usuário;
- cache da PWA atualizado para v0.8.0;
- orientação de instalação no Safari do iPhone;
- suporte ao prompt de instalação em navegadores compatíveis;
- página offline com indicador de conexão e botão de nova tentativa.

## Banco

- nenhuma migration;
- nenhuma mudança nos dados existentes.
