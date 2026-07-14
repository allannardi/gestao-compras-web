-- Gestão de Compras Web v0.3.0 — Fundação SaaS baseada em Famílias
-- Execute este arquivo UMA VEZ no SQL Editor de um projeto Supabase novo.
-- Esta migration não grava compras e não migra dados do Turso.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================
-- 1. Estrutura central
-- ============================================================

create table if not exists public.familias (
    id uuid primary key default gen_random_uuid(),
    nome text not null check (char_length(trim(nome)) between 2 and 80),
    plano text not null default 'free' check (plano in ('free', 'premium')),
    status text not null default 'ativa' check (status in ('ativa', 'suspensa', 'cancelada')),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create table if not exists public.perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null check (char_length(trim(nome)) between 2 and 100),
    email text not null,
    familia_atual_id uuid references public.familias(id) on delete set null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create table if not exists public.familia_membros (
    familia_id uuid not null references public.familias(id) on delete cascade,
    usuario_id uuid not null references auth.users(id) on delete cascade,
    papel text not null default 'membro' check (papel in ('administrador', 'membro')),
    status text not null default 'ativo' check (status in ('ativo', 'inativo')),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    primary key (familia_id, usuario_id)
);

create table if not exists public.convites_familia (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    email text not null,
    papel text not null default 'membro' check (papel in ('administrador', 'membro')),
    status text not null default 'pendente' check (status in ('pendente', 'aceito', 'cancelado', 'expirado')),
    token_hash text,
    convidado_por uuid not null references auth.users(id) on delete restrict,
    expira_em timestamptz not null default (now() + interval '7 days'),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create table if not exists public.configuracoes_familia (
    familia_id uuid primary key references public.familias(id) on delete cascade,
    moeda text not null default 'BRL',
    localidade text not null default 'pt-BR',
    limite_usuarios integer not null default 2 check (limite_usuarios > 0),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_perfis_familia_atual
    on public.perfis(familia_atual_id);
create index if not exists idx_familia_membros_usuario
    on public.familia_membros(usuario_id, status);
create index if not exists idx_convites_familia_email
    on public.convites_familia(familia_id, lower(email), status);

-- ============================================================
-- 2. Helpers privados para RLS
-- ============================================================

create or replace function private.usuario_pertence_familia(p_familia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.familia_membros fm
        where fm.familia_id = p_familia_id
          and fm.usuario_id = (select auth.uid())
          and fm.status = 'ativo'
    );
$$;

create or replace function private.usuario_admin_familia(p_familia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.familia_membros fm
        where fm.familia_id = p_familia_id
          and fm.usuario_id = (select auth.uid())
          and fm.status = 'ativo'
          and fm.papel = 'administrador'
    );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.usuario_pertence_familia(uuid) from public;
revoke all on function private.usuario_admin_familia(uuid) from public;
grant execute on function private.usuario_pertence_familia(uuid) to authenticated;
grant execute on function private.usuario_admin_familia(uuid) to authenticated;

-- ============================================================
-- 3. Criação automática da família no cadastro
-- ============================================================

create or replace function public.criar_familia_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_familia_id uuid;
    v_nome text;
    v_familia_nome text;
begin
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
    v_familia_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'familia_nome', '')), '');

    if v_nome is null then
        v_nome := split_part(coalesce(new.email, 'Usuário'), '@', 1);
    end if;

    if char_length(v_nome) < 2 then
        v_nome := 'Usuário';
    end if;

    if v_familia_nome is null or char_length(v_familia_nome) < 2 then
        v_familia_nome := 'Família de ' || v_nome;
    end if;

    insert into public.familias (nome)
    values (left(v_familia_nome, 80))
    returning id into v_familia_id;

    insert into public.perfis (id, nome, email, familia_atual_id)
    values (
        new.id,
        left(v_nome, 100),
        coalesce(new.email, ''),
        v_familia_id
    );

    insert into public.familia_membros (familia_id, usuario_id, papel, status)
    values (v_familia_id, new.id, 'administrador', 'ativo');

    insert into public.configuracoes_familia (familia_id)
    values (v_familia_id);

    return new;
end;
$$;

revoke all on function public.criar_familia_novo_usuario() from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.criar_familia_novo_usuario() to supabase_auth_admin;

drop trigger if exists on_auth_user_created_gestao_compras on auth.users;
create trigger on_auth_user_created_gestao_compras
    after insert on auth.users
    for each row execute procedure public.criar_familia_novo_usuario();

-- ============================================================
-- 4. Contexto do usuário autenticado para o FastAPI
-- ============================================================

create or replace function public.meu_contexto()
returns table (
    user_id uuid,
    email text,
    nome text,
    familia_id uuid,
    familia_nome text,
    papel text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id as user_id,
        p.email,
        p.nome,
        f.id as familia_id,
        f.nome as familia_nome,
        fm.papel
    from public.perfis p
    join public.familias f
      on f.id = p.familia_atual_id
    join public.familia_membros fm
      on fm.familia_id = f.id
     and fm.usuario_id = p.id
     and fm.status = 'ativo'
    where p.id = (select auth.uid())
    limit 1;
$$;

revoke all on function public.meu_contexto() from public, anon;
grant execute on function public.meu_contexto() to authenticated;

-- ============================================================
-- 5. Row Level Security
-- ============================================================

alter table public.familias enable row level security;
alter table public.perfis enable row level security;
alter table public.familia_membros enable row level security;
alter table public.convites_familia enable row level security;
alter table public.configuracoes_familia enable row level security;

-- Remoção segura para permitir reaplicar a migration durante testes.
drop policy if exists familias_select_membro on public.familias;
drop policy if exists familias_update_admin on public.familias;
drop policy if exists perfis_select_proprio on public.perfis;
drop policy if exists perfis_update_proprio on public.perfis;
drop policy if exists membros_select_familia on public.familia_membros;
drop policy if exists convites_select_admin on public.convites_familia;
drop policy if exists convites_insert_admin on public.convites_familia;
drop policy if exists convites_update_admin on public.convites_familia;
drop policy if exists configuracoes_select_membro on public.configuracoes_familia;
drop policy if exists configuracoes_update_admin on public.configuracoes_familia;

create policy familias_select_membro
on public.familias for select
to authenticated
using ((select private.usuario_pertence_familia(id)));

create policy familias_update_admin
on public.familias for update
to authenticated
using ((select private.usuario_admin_familia(id)))
with check ((select private.usuario_admin_familia(id)));

create policy perfis_select_proprio
on public.perfis for select
to authenticated
using (id = (select auth.uid()));

create policy perfis_update_proprio
on public.perfis for update
to authenticated
using (id = (select auth.uid()))
with check (
    id = (select auth.uid())
    and (
        familia_atual_id is null
        or (select private.usuario_pertence_familia(familia_atual_id))
    )
);

create policy membros_select_familia
on public.familia_membros for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy convites_select_admin
on public.convites_familia for select
to authenticated
using ((select private.usuario_admin_familia(familia_id)));

create policy convites_insert_admin
on public.convites_familia for insert
to authenticated
with check (
    (select private.usuario_admin_familia(familia_id))
    and convidado_por = (select auth.uid())
);

create policy convites_update_admin
on public.convites_familia for update
to authenticated
using ((select private.usuario_admin_familia(familia_id)))
with check ((select private.usuario_admin_familia(familia_id)));

create policy configuracoes_select_membro
on public.configuracoes_familia for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy configuracoes_update_admin
on public.configuracoes_familia for update
to authenticated
using ((select private.usuario_admin_familia(familia_id)))
with check ((select private.usuario_admin_familia(familia_id)));

-- Privilégios mínimos; RLS continua sendo a barreira por linha.
revoke all on public.familias from anon;
revoke all on public.perfis from anon;
revoke all on public.familia_membros from anon;
revoke all on public.convites_familia from anon;
revoke all on public.configuracoes_familia from anon;

grant select, update on public.familias to authenticated;
grant select, update on public.perfis to authenticated;
grant select on public.familia_membros to authenticated;
grant select, insert, update on public.convites_familia to authenticated;
grant select, update on public.configuracoes_familia to authenticated;

commit;
