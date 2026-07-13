# Como aplicar — v0.2.2

## 1. Pare frontend e backend

Em cada terminal:

```text
Ctrl + C
```

## 2. Extraia o patch

Extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

Não apague:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

## 3. Validar o backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

Abra:

```text
http://localhost:8000/health
```

A versão esperada é `0.2.2`.

## 4. Validar o frontend

Em outro terminal:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run dev
```

Abra:

```text
http://localhost:3000
```

Confirme que a API conecta e que a leitura continua funcionando.

## 5. Commit e push

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.2.2 - prepara deploy online e teste no iPhone"
git push
```

Depois siga `docs/DEPLOY_ONLINE_V0_2_2.md`.
