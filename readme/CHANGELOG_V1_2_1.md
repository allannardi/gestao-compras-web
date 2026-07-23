# Changelog — v1.2.1

## Adicionar nota

- o botão **Usar uma foto já tirada** passa a abrir o seletor de imagens sem
  solicitar diretamente a câmera;
- a captura por câmera continua vinculada ao botão **Ler QR-CODE da NF**;
- navegadores sem `getUserMedia` continuam com um campo separado de fallback
  para abrir a câmera traseira;
- selecionar novamente o mesmo arquivo continua funcionando porque o campo é
  limpo após cada escolha.

## Versão e publicação

- aplicativo, API declarada e cache da PWA atualizados para v1.2.1;
- nenhuma migration;
- nenhuma dependência nova;
- nenhuma variável de ambiente nova.
