# Arquitetura — Gestão de Compras Web

## Visão geral

```text
Safari / PWA no iPhone
          │
          ▼
 Next.js + TypeScript
          │ HTTPS / JSON
          ▼
     FastAPI + Python
          │
          ▼
 PostgreSQL / Supabase
```

## Frontend

Responsabilidades:

- navegação;
- câmera e captura da imagem;
- leitura visual e feedback ao usuário;
- conferência da NFC-e em cards;
- dashboard e histórico;
- instalação como PWA;
- autenticação e sessão.

O frontend não deve conter as regras centrais de interpretação da NFC-e.

## Backend

Responsabilidades:

- receber imagem ou URL da NFC-e;
- detectar e interpretar QR Code;
- consultar a página pública da NFC-e;
- extrair mercado, CNPJ, data, pagamento e itens;
- consolidar itens idênticos;
- classificar produtos;
- validar duplicidade;
- salvar compras e histórico;
- disponibilizar dados ao frontend.

## Banco

Estrutura inicial recomendada:

```text
contas
perfis
categorias
supermercados
produtos
compras
itens_compra
historico_precos
```

Todas as tabelas de negócio devem possuir `conta_id`, mesmo que inicialmente exista apenas uma conta familiar.

## Autenticação

Supabase Auth será utilizado posteriormente. O primeiro desenvolvimento pode usar um usuário de teste, mas a arquitetura não deve depender de uma identidade fixa no código.

## Compatibilidade com o sistema atual

Os módulos Python atuais deverão ser avaliados individualmente:

```text
services/captura.py
services/nfce.py
services/data.py
services/utils.py
```

A meta é extrair regras puras e testáveis, evitando transportar dependências do Streamlit para o backend.

## Endpoints planejados

```text
GET  /health
POST /api/v1/nfce/preview
POST /api/v1/compras
GET  /api/v1/compras
GET  /api/v1/compras/{id}
GET  /api/v1/produtos
PATCH /api/v1/produtos/{id}
GET  /api/v1/dashboard/resumo
GET  /api/v1/historico-precos
```

## Segurança

- tokens somente em variáveis de ambiente;
- CORS restrito aos domínios autorizados;
- autenticação obrigatória antes do uso em produção;
- validação de arquivos e tamanho máximo de upload;
- nenhuma credencial no repositório.
