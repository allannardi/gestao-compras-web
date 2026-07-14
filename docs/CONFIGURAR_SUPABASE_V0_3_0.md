# Configurar Supabase — v0.3.0

## 1. Criar o projeto

No Supabase, crie um projeto chamado, por exemplo:

```text
gestao-compras-web
```

## 2. Executar a migration

Abra **SQL Editor → New query** e execute todo o conteúdo de:

```text
database/migrations/001_fundacao_familias.sql
```

O script cria:

- famílias;
- perfis;
- membros e papéis;
- estrutura de convites;
- configurações da família;
- criação automática da família no cadastro;
- RLS por `familia_id`;
- função `meu_contexto()` usada pelo FastAPI.

## 3. Configurar autenticação

Em **Authentication → URL Configuration**:

- Site URL local: `http://localhost:3000` durante o teste local;
- adicione também a URL real da Vercel em Redirect URLs.

Para facilitar o primeiro teste, você pode manter a confirmação de e-mail habilitada. Nesse caso, o usuário deverá confirmar o e-mail antes de entrar.

## 4. Copiar URL e chave publicável

Use a **Project URL** e a **Publishable key**. Não coloque `service_role` ou chave secreta no frontend.

## 5. Frontend local

Edite `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

## 6. Backend local

Edite `backend/.env` e preserve as variáveis existentes:

```env
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
CORS_ORIGIN_REGEX=
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
SUPABASE_REQUEST_TIMEOUT_SECONDS=20
```

## 7. Vercel

Adicione e faça novo deploy manual:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Mantenha `NEXT_PUBLIC_API_URL`.

## 8. Render

Adicione e faça novo deploy manual:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_REQUEST_TIMEOUT_SECONDS=20
```

Mantenha o CORS já validado para localhost e URL da Vercel.

## 9. Teste de isolamento

Crie duas contas com e-mails diferentes:

- cada cadastro cria automaticamente uma família diferente;
- `/api/v1/auth/me` deve retornar `familia_id` diferente;
- os dados futuros sempre deverão ser filtrados e protegidos por esse `familia_id`.
