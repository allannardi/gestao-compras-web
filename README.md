# Gestão de Compras Web

Nova aplicação web/mobile do projeto **Gestão de Compras**.

## Estado do projeto

- Versão atual: **v0.2.0 — Prova inicial da NFC-e**
- Último checkpoint validado: **v0.1.1 — Integração local**
- Aplicação atual estável: **Gestão de Compras Streamlit v0.5.14**
- O Streamlit permanece ativo e sem alterações estruturais durante a migração.
- Este repositório é separado de `gestao-compras`.

## Arquitetura

- Frontend: Next.js + React + TypeScript
- Mobile: PWA responsiva
- Backend: FastAPI + Python
- Banco futuro: PostgreSQL no Supabase
- Autenticação futura: Supabase Auth
- Deploy futuro do frontend: Vercel
- Deploy futuro do backend: serviço Python separado

## Objetivo da v0.2.0

Validar o fluxo técnico mais importante antes de configurar o banco novo:

```text
Câmera/foto → Next.js → FastAPI → QR Code → portal NFC-e → conferência em cards
```

Nesta versão:

- a câmera web é aberta pelo botão principal;
- existe uma opção secundária para foto já tirada;
- a imagem é processada no FastAPI;
- o QR Code é interpretado com OpenCV;
- mercado, CNPJ, data, pagamento, valor e itens são extraídos;
- itens idênticos são consolidados;
- nada é gravado no Turso ou PostgreSQL.

## Regra principal da migração

A v0.5.14 em Streamlit é a referência funcional. As regras da NFC-e desta versão foram adaptadas a partir do comportamento validado no sistema atual, sem importar Streamlit para o backend novo.

## Rodar localmente

### Backend

```bat
cd backend
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

Teste:

```text
http://localhost:8000/health
```

### Frontend

```bat
cd frontend
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Aplicação do patch

Consulte:

```text
COMO_APLICAR_V0_2_0.md
```

## Ícones

Os ícones validados permanecem em:

```text
frontend/public/icons/app_icon.png
frontend/public/favicon.png
```

Não substituir esses arquivos sem solicitação.
