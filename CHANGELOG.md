# Changelog — Gestão de Compras Web

## v0.3.0 — Fundação SaaS por Famílias

- adiciona Supabase Auth por e-mail e senha;
- adiciona os fluxos **Entrar** e **Criar minha família**;
- cria automaticamente família, perfil, administrador e configurações iniciais;
- adiciona as tabelas `familias`, `perfis`, `familia_membros`, `convites_familia` e `configuracoes_familia`;
- implementa Row Level Security baseada em `familia_id`;
- adiciona o contexto autenticado `/api/v1/auth/me`;
- protege a prévia da NFC-e com Bearer Token;
- mantém a câmera, foto, consulta da NFC-e, Vercel e Render da v0.2.2;
- não grava compras nesta versão.

## v0.2.2 — Deploy online

- frontend publicado na Vercel;
- backend publicado no Render;
- fluxo completo validado no iPhone, Safari e atalho da tela inicial.
