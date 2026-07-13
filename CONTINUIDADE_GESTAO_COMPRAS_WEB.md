# CONTINUIDADE — GESTÃO DE COMPRAS WEB

## Projeto original preservado

O sistema atual permanece em produção:

- Stack: Streamlit + Turso + Streamlit Cloud
- Checkpoint: v0.5.14 — Captura original restaurada
- Python no Streamlit Cloud: 3.12
- URL: https://gestao-compras.streamlit.app
- Repositório atual: https://github.com/allannardi/gestao-compras.git

Esse sistema é a referência funcional e plano de contingência durante a migração.

## Novo projeto

Nome sugerido do repositório:

```text
gestao-compras-web
```

Arquitetura:

```text
Next.js PWA
    ↓
FastAPI
    ↓
PostgreSQL / Supabase
```

## Decisões obrigatórias

1. Não converter diretamente o `app.py`.
2. Não interromper o Streamlit durante a construção.
3. Não voltar para aplicativo nativo de iPhone agora.
4. Priorizar o iPhone e o uso mobile.
5. Manter cards compactos.
6. Evitar tabelas largas e modais pesados.
7. Reaproveitar regras Python validadas da NFC-e.
8. Não colocar tokens, senhas ou arquivos `.env` no GitHub.
9. Preservar os ícones atuais.
10. Validar cada módulo novo comparando com o Streamlit.

## Primeiro marco funcional real

O primeiro marco relevante da nova aplicação será:

> Abrir a PWA no iPhone, capturar uma NFC-e, consultar a nota e exibir corretamente os itens para conferência.

Até esse marco estar validado, não priorizar dashboard avançado, exportações ou recursos SaaS.
