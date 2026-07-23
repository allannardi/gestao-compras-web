# Como aplicar a v1.2.1 — Hotfix da galeria

A v1.2.1 deve ser aplicada sobre a v1.2.0 validada.

## 1. Preserve os arquivos locais

Não substitua nem envie ao Git:

- `backend/.env`;
- `backend/.venv`;
- `frontend/.env.local`;
- `frontend/node_modules`;
- `frontend/package-lock.json`;
- pasta `Notas/`.

## 2. Aplicação

Extraia o patch sobre a raiz do projeto:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Não há migration, dependência ou variável de ambiente nova.

## 3. Publicação

```bat
git add .
git commit -m "v1.2.1 - corrige selecao de foto da galeria"
git push
```

## 4. Teste recomendado no iPhone

1. Abra **Adicionar nota**.
2. Toque em **Usar uma foto já tirada**.
3. Confirme que o seletor de fotos/arquivos é aberto, sem iniciar a câmera.
4. Escolha uma imagem da NFC-e e conclua a leitura.
5. Volte e toque em **Ler QR-CODE da NF**.
6. Confirme que a câmera continua abrindo normalmente.

Se o atalho da tela inicial ainda mostrar a versão anterior, feche o PWA por
completo e abra novamente para o novo service worker assumir o cache v1.2.1.
