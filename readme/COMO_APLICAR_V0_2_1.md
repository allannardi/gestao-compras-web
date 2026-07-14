# Gestão de Compras Web v0.2.1 — Correção da câmera preta

## Causa corrigida

Na v0.2.0, a câmera era obtida corretamente, mas o código tentava ligar o
`MediaStream` ao elemento `<video>` usando um `setTimeout(0)`. Em alguns
navegadores, esse comando podia executar antes de o React terminar de criar o
vídeo na tela. O resultado era a moldura da câmera aberta, porém sem imagem.

## O que mudou

- o stream passou a ser controlado pelo estado do React;
- o vídeo é conectado somente depois que o elemento existe;
- a reprodução começa após `loadedmetadata`;
- o botão de captura fica bloqueado até o evento `playing`;
- aparece `Iniciando câmera…` enquanto o primeiro quadro não chega;
- a câmera é pausada e desligada ao cancelar ou sair da tela.

## Como aplicar

1. Pare somente o frontend com `Ctrl + C`.
2. Extraia este ZIP sobre a raiz do projeto:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

3. Confirme a substituição dos arquivos.
4. Não apague `.env.local`, `node_modules` ou `package-lock.json`.
5. Inicie novamente:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run dev
```

O backend da v0.2.0 pode continuar aberto, pois nenhum arquivo dele foi alterado.

## Teste esperado

Ao clicar em `Ler QR-CODE da NF`:

1. aparece `Iniciando câmera…`;
2. o navegador solicita permissão, se necessário;
3. a imagem da câmera aparece;
4. o botão muda para `Capturar QR Code`;
5. a captura pode ser enviada ao backend normalmente.
