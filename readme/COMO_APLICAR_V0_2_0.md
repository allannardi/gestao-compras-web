# Como aplicar a v0.2.0

## 1. Pare os dois terminais

Em frontend e backend:

```text
Ctrl + C
```

## 2. Extraia o patch

Extraia o conteúdo do ZIP diretamente sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos existentes.

O patch não contém `.env`, `.env.local`, `package-lock.json`, `node_modules`, `.venv` ou segredos.

## 3. Atualize o backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

Teste:

```text
http://localhost:8000/health
```

A versão esperada é `0.2.0`.

## 4. Inicie o frontend

Em outro CMD:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run dev
```

Não é necessário executar `npm install`, porque esta versão não adiciona pacotes JavaScript.

Abra:

```text
http://localhost:3000
```

## 5. Teste recomendado no computador

1. Confirme `API conectada`.
2. Clique em `Usar uma foto já tirada`.
3. Escolha uma imagem nítida do QR Code de uma NFC-e.
4. Aguarde a consulta.
5. Confira supermercado, data, valor, pagamento e itens.
6. Confirme a mensagem de que nada foi salvo.
7. Depois teste `Ler QR-CODE da NF` com a câmera do computador.

## 6. Commit após validação

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.2.0 - prova inicial da NFC-e"
git push
```
