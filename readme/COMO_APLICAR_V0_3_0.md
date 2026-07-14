# Como aplicar — Gestão de Compras Web v0.3.0

Esta versão adiciona autenticação e a fundação por Famílias. Leia também:

```text
docs/CONFIGURAR_SUPABASE_V0_3_0.md
```

## 1. Antes de extrair

Pare frontend e backend com `Ctrl + C`.

## 2. Extração

Extraia o patch sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

O patch não contém e não substitui:

- `backend/.env`
- `backend/.venv`
- `frontend/.env.local`
- `frontend/node_modules`
- `frontend/package-lock.json`

## 3. Dependência do frontend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm install
```

## 4. Supabase

Crie o projeto e execute no SQL Editor:

```text
database/migrations/001_fundacao_familias.sql
```

Depois configure as variáveis descritas no guia.

## 5. Backend local

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

## 6. Frontend local

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run dev
```

## 7. Validação

1. Criar uma família de teste.
2. Confirmar o e-mail, se exigido.
3. Entrar.
4. Confirmar nome da família e papel Administrador.
5. Ler uma NFC-e por foto.
6. Ler uma NFC-e pela câmera.
7. Sair e entrar novamente.
8. Criar outro usuário com outro e-mail e confirmar que recebe outra família.
9. Confirmar que nenhuma compra foi gravada.
