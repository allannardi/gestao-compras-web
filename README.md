# Gestão de Compras Web

Nova aplicação web/mobile do projeto **Gestão de Compras**.

## Estado do projeto

- Versão inicial deste repositório: **v0.1.0 — Estrutura inicial**
- Aplicação atual estável: **Gestão de Compras Streamlit v0.5.14**
- A aplicação Streamlit deve permanecer ativa e sem alterações estruturais durante a migração.
- Este repositório é separado do repositório `gestao-compras`.

## Arquitetura definida

- Frontend: Next.js + React + TypeScript
- Mobile: PWA responsiva
- Backend: FastAPI + Python
- Banco futuro: PostgreSQL no Supabase
- Autenticação futura: Supabase Auth
- Deploy futuro do frontend: Vercel
- Deploy futuro do backend: serviço Python separado

## Objetivo da v0.1

Provar a fundação técnica:

1. Frontend Next.js inicial.
2. Backend FastAPI inicial.
3. Endpoint de saúde.
4. Comunicação frontend → backend.
5. Estrutura preparada para PWA.
6. Base documental para a migração.

## Regra principal da migração

A v0.5.14 em Streamlit é a referência funcional. Nenhuma regra de negócio deve ser reescrita sem comparação com o comportamento validado no sistema atual.

## Próximas ações locais

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Teste:

```text
http://localhost:8000/health
```

### Frontend

Requisito: Node.js 20.9 ou superior.

```bash
cd frontend
npm install
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Crie `frontend/.env.local` a partir de `frontend/.env.example`.

## Ícones

Os ícones validados do projeto Streamlit já estão incluídos em:

```text
frontend/public/icons/app_icon.png
frontend/public/favicon.png
```

Não substituir esses arquivos sem solicitação.
