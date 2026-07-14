# Arquitetura — Gestão de Compras Web

## Visão geral

```text
Safari / PWA no iPhone
          │
          ▼
 Next.js + TypeScript
          │ HTTPS / Bearer JWT
          ▼
     FastAPI + Python
          │
          ├── Supabase Auth
          └── PostgreSQL + RLS
```

## Isolamento por Família

A unidade de dados não é o usuário individual. É a família:

```text
Família
  ├── Administrador
  ├── Membros
  ├── Compras
  ├── Produtos
  └── Histórico
```

Todo dado de negócio futuro deverá conter `familia_id`. As políticas RLS
validarão se `auth.uid()` pertence à família do registro.

## Frontend

Responsabilidades:

- login e criação da família com Supabase Auth;
- persistência e atualização da sessão;
- envio do JWT ao FastAPI;
- câmera, captura e conferência da NFC-e;
- interface mobile/PWA;
- futuras telas de compras, produtos e histórico.

O frontend utiliza apenas a chave publicável do Supabase. Chaves secretas ou
`service_role` nunca podem ser incluídas no navegador.

## Backend

Responsabilidades:

- validar o token do Supabase;
- carregar o contexto da família autenticada;
- proteger endpoints;
- detectar e interpretar QR Code;
- consultar e extrair dados da NFC-e;
- futuramente aplicar regras e persistir compras.

Endpoints atuais:

```text
GET  /health
GET  /api/v1/status
GET  /api/v1/auth/me
POST /api/v1/nfce/preview
```

## Banco v0.3.0

```text
familias
perfis
familia_membros
convites_familia
configuracoes_familia
```

Ao cadastrar um usuário, um trigger cria automaticamente:

1. família;
2. perfil;
3. vínculo como Administrador;
4. configurações iniciais.

## Segurança

- Supabase Auth por e-mail e senha;
- JWT validado pelo backend;
- RLS habilitada nas tabelas públicas;
- funções auxiliares `security definer` sem parâmetros controlados para contexto;
- CORS restrito;
- uploads limitados a 12 MB;
- URLs privadas bloqueadas na consulta de NFC-e;
- nenhuma credencial no repositório.

## Persistência v0.3.1

A compra é enviada pelo Next.js ao endpoint autenticado `POST /api/v1/compras`.
O FastAPI valida o payload e chama a RPC `registrar_compra_nfce` usando o JWT do usuário.
A função PostgreSQL deriva a família da sessão (`auth.uid()`), grava a compra em uma única transação e nunca aceita `familia_id` do navegador.

Fluxo:

```text
NFC-e conferida
    ↓
POST /api/v1/compras + Bearer Token
    ↓
FastAPI / validação
    ↓
Supabase RPC registrar_compra_nfce
    ↓
compras + itens + produtos + supermercado + histórico
```
