begin;

-- ============================================================
-- Gestão de Compras Web v1.2.0 — Fundação do Admin Geral
-- Execute depois de 015_mesclagem_aliases_produtos.sql.
--
-- Esta migration não implementa planos, cobrança ou recursos Premium.
-- Ela cria um painel operacional global, controles administrativos,
-- auditoria e exclusões definitivas com confirmação reforçada.
-- ============================================================

create table if not exists public.administradores_sistema (
    usuario_id uuid primary key references auth.users(id) on delete cascade,
    ativo boolean not null default true,
    criado_por uuid references auth.users(id) on delete set null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create table if not exists public.auditoria_admin_geral (
    id uuid primary key default gen_random_uuid(),
    administrador_id uuid references auth.users(id) on delete set null,
    acao text not null,
    entidade text not null check (entidade in ('familia', 'usuario', 'membro', 'sistema')),
    entidade_id uuid,
    familia_id uuid references public.familias(id) on delete set null,
    usuario_alvo_id uuid,
    resumo text not null,
    dados_anteriores jsonb not null default '{}'::jsonb,
    dados_novos jsonb not null default '{}'::jsonb,
    origem_ip text,
    request_id text,
    criado_em timestamptz not null default now()
);

create index if not exists auditoria_admin_geral_data_idx
    on public.auditoria_admin_geral(criado_em desc);
create index if not exists auditoria_admin_geral_entidade_idx
    on public.auditoria_admin_geral(entidade, entidade_id, criado_em desc);
create index if not exists auditoria_admin_geral_administrador_idx
    on public.auditoria_admin_geral(administrador_id, criado_em desc);

alter table public.familias
    add column if not exists observacao_admin text;
alter table public.familias
    add column if not exists suspensa_em timestamptz;
alter table public.familias
    add column if not exists suspensa_por uuid references auth.users(id) on delete set null;

alter table public.administradores_sistema enable row level security;
alter table public.auditoria_admin_geral enable row level security;

revoke all on table public.administradores_sistema from public, anon, authenticated;
revoke all on table public.auditoria_admin_geral from public, anon, authenticated;

-- ============================================================
-- Permissão global
-- ============================================================

create or replace function private.usuario_admin_sistema(
    p_usuario_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
          from public.administradores_sistema a
         where a.usuario_id = p_usuario_id
           and a.ativo = true
    );
$$;

revoke all on function private.usuario_admin_sistema(uuid) from public, anon, authenticated;
grant execute on function private.usuario_admin_sistema(uuid) to service_role;

create or replace function private.exigir_admin_sistema()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para acessar o Admin Geral.';
    end if;

    if not private.usuario_admin_sistema(v_usuario_id) then
        raise exception using
            errcode = '42501',
            message = 'Seu usuário não possui acesso ao Admin Geral.';
    end if;

    return v_usuario_id;
end;
$$;

revoke all on function private.exigir_admin_sistema() from public, anon, authenticated;

create or replace function private.registrar_auditoria_admin(
    p_administrador_id uuid,
    p_acao text,
    p_entidade text,
    p_entidade_id uuid,
    p_familia_id uuid,
    p_usuario_alvo_id uuid,
    p_resumo text,
    p_dados_anteriores jsonb default '{}'::jsonb,
    p_dados_novos jsonb default '{}'::jsonb,
    p_origem_ip text default null,
    p_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid;
begin
    insert into public.auditoria_admin_geral (
        administrador_id,
        acao,
        entidade,
        entidade_id,
        familia_id,
        usuario_alvo_id,
        resumo,
        dados_anteriores,
        dados_novos,
        origem_ip,
        request_id
    )
    values (
        p_administrador_id,
        left(trim(p_acao), 120),
        p_entidade,
        p_entidade_id,
        p_familia_id,
        p_usuario_alvo_id,
        left(trim(p_resumo), 500),
        coalesce(p_dados_anteriores, '{}'::jsonb),
        coalesce(p_dados_novos, '{}'::jsonb),
        nullif(left(trim(coalesce(p_origem_ip, '')), 120), ''),
        nullif(left(trim(coalesce(p_request_id, '')), 160), '')
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function private.registrar_auditoria_admin(
    uuid, text, text, uuid, uuid, uuid, text, jsonb, jsonb, text, text
) from public, anon, authenticated;

-- ============================================================
-- Contexto normal passa a informar a situação da família.
-- O bloqueio efetivo das APIs normais é aplicado também no FastAPI.
-- ============================================================

drop function if exists public.meu_contexto();
create function public.meu_contexto()
returns table (
    user_id uuid,
    email text,
    nome text,
    familia_id uuid,
    familia_nome text,
    papel text,
    familia_status text
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
        fm.papel,
        f.status as familia_status
    from public.perfis p
    join public.familias f
      on f.id = p.familia_atual_id
    join public.familia_membros fm
      on fm.familia_id = f.id
     and fm.usuario_id = p.id
     and fm.status = 'ativo'
    where p.id = auth.uid()
    limit 1;
$$;

revoke all on function public.meu_contexto() from public, anon;
grant execute on function public.meu_contexto() to authenticated;

-- ============================================================
-- Acesso e resumo
-- ============================================================

create or replace function public.meu_acesso_admin_geral()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_perfil record;
begin
    if v_usuario_id is null or not private.usuario_admin_sistema(v_usuario_id) then
        return jsonb_build_object('admin_geral', false);
    end if;

    select p.nome, p.email
      into v_perfil
      from public.perfis p
     where p.id = v_usuario_id
     limit 1;

    return jsonb_build_object(
        'admin_geral', true,
        'usuario_id', v_usuario_id,
        'nome', coalesce(v_perfil.nome, 'Administrador Geral'),
        'email', coalesce(v_perfil.email, '')
    );
end;
$$;

create or replace function public.admin_resumo_sistema()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
begin
    return jsonb_build_object(
        'familias_total', (select count(*)::integer from public.familias),
        'familias_ativas', (select count(*)::integer from public.familias where status = 'ativa'),
        'familias_suspensas', (select count(*)::integer from public.familias where status = 'suspensa'),
        'familias_novas_30_dias', (
            select count(*)::integer from public.familias
             where criado_em >= now() - interval '30 days'
        ),
        'usuarios_total', (select count(*)::integer from public.perfis),
        'membros_ativos', (
            select count(*)::integer from public.familia_membros where status = 'ativo'
        ),
        'compras_total', (
            select count(*)::integer from public.compras where status <> 'excluida'
        ),
        'itens_total', (select count(*)::integer from public.itens_compra),
        'produtos_total', (
            select count(*)::integer from public.produtos where ativo = true
        ),
        'supermercados_total', (
            select count(*)::integer from public.supermercados where ativo = true
        ),
        'administradores_sistema', (
            select count(*)::integer from public.administradores_sistema where ativo = true
        ),
        'gerado_em', now(),
        'administrador_id', v_admin_id
    );
end;
$$;

-- ============================================================
-- Famílias
-- ============================================================

create or replace function public.admin_listar_familias(
    p_busca text default null,
    p_status text default null,
    p_limite integer default 50,
    p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
    v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_total integer;
    v_familias jsonb;
begin
    if v_status is not null and v_status not in ('ativa', 'suspensa', 'cancelada') then
        raise exception using errcode = '22023', message = 'Situação de família inválida.';
    end if;

    select count(*)::integer
      into v_total
      from public.familias f
     where (v_status is null or f.status = v_status)
       and (
            v_busca is null
            or private.normalizar_texto(f.nome) like '%' || private.normalizar_texto(v_busca) || '%'
            or exists (
                select 1
                  from public.familia_membros fm
                  join public.perfis p on p.id = fm.usuario_id
                 where fm.familia_id = f.id
                   and (
                       private.normalizar_texto(p.nome) like '%' || private.normalizar_texto(v_busca) || '%'
                       or lower(p.email) like '%' || lower(v_busca) || '%'
                   )
            )
       );

    select coalesce(jsonb_agg(to_jsonb(x) order by x.ultima_atividade desc nulls last, x.nome), '[]'::jsonb)
      into v_familias
      from (
        select
            f.id,
            f.nome,
            f.status,
            coalesce(f.observacao_admin, '') as observacao_admin,
            f.criado_em,
            f.atualizado_em,
            (
                select count(*)::integer
                  from public.familia_membros fm
                 where fm.familia_id = f.id and fm.status = 'ativo'
            ) as membros_count,
            (
                select count(*)::integer
                  from public.familia_membros fm
                 where fm.familia_id = f.id
                   and fm.status = 'ativo'
                   and fm.papel = 'administrador'
            ) as administradores_count,
            (
                select count(*)::integer
                  from public.compras c
                 where c.familia_id = f.id and c.status <> 'excluida'
            ) as compras_count,
            (
                select count(*)::integer
                  from public.produtos p
                 where p.familia_id = f.id and p.ativo = true
            ) as produtos_count,
            (
                select count(*)::integer
                  from public.itens_compra i
                 where i.familia_id = f.id
            ) as itens_count,
            greatest(
                f.atualizado_em,
                (select max(c.atualizado_em) from public.compras c where c.familia_id = f.id),
                (select max(fm.atualizado_em) from public.familia_membros fm where fm.familia_id = f.id)
            ) as ultima_atividade,
            coalesce((
                select p.nome
                  from public.familia_membros fm
                  join public.perfis p on p.id = fm.usuario_id
                 where fm.familia_id = f.id
                   and fm.status = 'ativo'
                   and fm.papel = 'administrador'
                 order by fm.criado_em
                 limit 1
            ), 'Sem administrador') as administrador_nome,
            coalesce((
                select p.email
                  from public.familia_membros fm
                  join public.perfis p on p.id = fm.usuario_id
                 where fm.familia_id = f.id
                   and fm.status = 'ativo'
                   and fm.papel = 'administrador'
                 order by fm.criado_em
                 limit 1
            ), '') as administrador_email
          from public.familias f
         where (v_status is null or f.status = v_status)
           and (
                v_busca is null
                or private.normalizar_texto(f.nome) like '%' || private.normalizar_texto(v_busca) || '%'
                or exists (
                    select 1
                      from public.familia_membros fm
                      join public.perfis p on p.id = fm.usuario_id
                     where fm.familia_id = f.id
                       and (
                           private.normalizar_texto(p.nome) like '%' || private.normalizar_texto(v_busca) || '%'
                           or lower(p.email) like '%' || lower(v_busca) || '%'
                       )
                )
           )
         order by ultima_atividade desc nulls last, f.nome
         limit v_limite offset v_offset
      ) x;

    return jsonb_build_object(
        'familias', v_familias,
        'total', v_total,
        'limite', v_limite,
        'offset', v_offset,
        'tem_mais', v_offset + jsonb_array_length(v_familias) < v_total,
        'administrador_id', v_admin_id
    );
end;
$$;

create or replace function public.admin_detalhar_familia(p_familia_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_familia jsonb;
    v_membros jsonb;
begin
    select jsonb_build_object(
        'id', f.id,
        'nome', f.nome,
        'status', f.status,
        'observacao_admin', coalesce(f.observacao_admin, ''),
        'criado_em', f.criado_em,
        'atualizado_em', f.atualizado_em,
        'suspensa_em', f.suspensa_em,
        'membros_count', (select count(*)::integer from public.familia_membros fm where fm.familia_id = f.id and fm.status = 'ativo'),
        'compras_count', (select count(*)::integer from public.compras c where c.familia_id = f.id and c.status <> 'excluida'),
        'itens_count', (select count(*)::integer from public.itens_compra i where i.familia_id = f.id),
        'produtos_count', (select count(*)::integer from public.produtos p where p.familia_id = f.id and p.ativo = true),
        'supermercados_count', (select count(*)::integer from public.supermercados s where s.familia_id = f.id and s.ativo = true),
        'ultima_atividade', greatest(
            f.atualizado_em,
            (select max(c.atualizado_em) from public.compras c where c.familia_id = f.id),
            (select max(fm.atualizado_em) from public.familia_membros fm where fm.familia_id = f.id)
        )
    )
      into v_familia
      from public.familias f
     where f.id = p_familia_id;

    if v_familia is null then
        raise exception using errcode = 'P0002', message = 'Família não encontrada.';
    end if;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.papel, x.nome), '[]'::jsonb)
      into v_membros
      from (
        select
            p.id as usuario_id,
            p.nome,
            p.email,
            fm.papel,
            fm.status,
            fm.criado_em,
            (p.familia_atual_id = p_familia_id) as familia_atual,
            private.usuario_admin_sistema(p.id) as admin_geral
          from public.familia_membros fm
          join public.perfis p on p.id = fm.usuario_id
         where fm.familia_id = p_familia_id
      ) x;

    return jsonb_build_object(
        'familia', v_familia,
        'membros', v_membros,
        'administrador_id', v_admin_id
    );
end;
$$;

create or replace function public.admin_atualizar_familia(
    p_familia_id uuid,
    p_nome text default null,
    p_observacao text default null,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_anterior public.familias%rowtype;
    v_nome text;
    v_observacao text;
begin
    select * into v_anterior from public.familias where id = p_familia_id for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Família não encontrada.';
    end if;

    v_nome := coalesce(nullif(trim(coalesce(p_nome, '')), ''), v_anterior.nome);
    v_observacao := case
        when p_observacao is null then v_anterior.observacao_admin
        else nullif(trim(p_observacao), '')
    end;

    if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
        raise exception using errcode = '22023', message = 'O nome da família deve ter entre 2 e 80 caracteres.';
    end if;

    if v_observacao is not null and char_length(v_observacao) > 1000 then
        raise exception using errcode = '22023', message = 'A observação pode ter no máximo 1000 caracteres.';
    end if;

    update public.familias
       set nome = v_nome,
           observacao_admin = v_observacao,
           atualizado_em = now()
     where id = p_familia_id;

    perform private.registrar_auditoria_admin(
        v_admin_id,
        'familia_atualizada',
        'familia',
        p_familia_id,
        p_familia_id,
        null,
        'Dados administrativos da família atualizados.',
        jsonb_build_object('nome', v_anterior.nome, 'observacao_admin', v_anterior.observacao_admin),
        jsonb_build_object('nome', v_nome, 'observacao_admin', v_observacao),
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object(
        'mensagem', 'Família atualizada com sucesso.',
        'familia_id', p_familia_id,
        'nome', v_nome,
        'observacao_admin', coalesce(v_observacao, '')
    );
end;
$$;

create or replace function public.admin_alterar_status_familia(
    p_familia_id uuid,
    p_status text,
    p_motivo text,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_anterior public.familias%rowtype;
    v_status text := lower(trim(coalesce(p_status, '')));
    v_motivo text := trim(coalesce(p_motivo, ''));
begin
    if v_status not in ('ativa', 'suspensa') then
        raise exception using errcode = '22023', message = 'Situação administrativa inválida.';
    end if;
    if char_length(v_motivo) < 3 or char_length(v_motivo) > 500 then
        raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
    end if;

    select * into v_anterior from public.familias where id = p_familia_id for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Família não encontrada.';
    end if;

    update public.familias
       set status = v_status,
           observacao_admin = v_motivo,
           suspensa_em = case when v_status = 'suspensa' then now() else null end,
           suspensa_por = case when v_status = 'suspensa' then v_admin_id else null end,
           atualizado_em = now()
     where id = p_familia_id;

    perform private.registrar_auditoria_admin(
        v_admin_id,
        case when v_status = 'suspensa' then 'familia_suspensa' else 'familia_reativada' end,
        'familia',
        p_familia_id,
        p_familia_id,
        null,
        case when v_status = 'suspensa' then 'Família suspensa.' else 'Família reativada.' end,
        jsonb_build_object('status', v_anterior.status, 'observacao_admin', v_anterior.observacao_admin),
        jsonb_build_object('status', v_status, 'motivo', v_motivo),
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object(
        'mensagem', case when v_status = 'suspensa' then 'Família suspensa com sucesso.' else 'Família reativada com sucesso.' end,
        'familia_id', p_familia_id,
        'status', v_status
    );
end;
$$;

create or replace function public.admin_excluir_familia_definitivamente(
    p_familia_id uuid,
    p_nome_confirmacao text,
    p_confirmacao text,
    p_motivo text,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_familia public.familias%rowtype;
    v_resumo jsonb;
    v_usuarios_sem_familia integer := 0;
begin
    select * into v_familia from public.familias where id = p_familia_id for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Família não encontrada.';
    end if;

    if lower(trim(coalesce(p_nome_confirmacao, ''))) <> lower(trim(v_familia.nome)) then
        raise exception using errcode = '22023', message = 'Digite exatamente o nome da família.';
    end if;
    if trim(coalesce(p_confirmacao, '')) <> 'EXCLUIR DEFINITIVAMENTE' then
        raise exception using errcode = '22023', message = 'Digite EXCLUIR DEFINITIVAMENTE para confirmar.';
    end if;
    if char_length(trim(coalesce(p_motivo, ''))) < 3 then
        raise exception using errcode = '22023', message = 'Informe o motivo da exclusão.';
    end if;

    if exists (
        select 1
          from public.perfis p
         where p.id = v_admin_id
           and p.familia_atual_id = p_familia_id
    ) and not exists (
        select 1
          from public.familia_membros fm
          join public.familias f on f.id = fm.familia_id
         where fm.usuario_id = v_admin_id
           and fm.familia_id <> p_familia_id
           and fm.status = 'ativo'
           and f.status = 'ativa'
    ) then
        raise exception using
            errcode = 'P0001',
            message = 'Esta é a família atual do Admin Geral. Selecione ou mantenha outra família ativa antes de excluí-la.';
    end if;

    select jsonb_build_object(
        'nome', v_familia.nome,
        'status', v_familia.status,
        'membros_count', (select count(*)::integer from public.familia_membros where familia_id = p_familia_id and status = 'ativo'),
        'compras_count', (select count(*)::integer from public.compras where familia_id = p_familia_id),
        'itens_count', (select count(*)::integer from public.itens_compra where familia_id = p_familia_id),
        'produtos_count', (select count(*)::integer from public.produtos where familia_id = p_familia_id),
        'supermercados_count', (select count(*)::integer from public.supermercados where familia_id = p_familia_id),
        'motivo', trim(p_motivo)
    ) into v_resumo;

    update public.perfis p
       set familia_atual_id = (
            select fm.familia_id
              from public.familia_membros fm
              join public.familias f on f.id = fm.familia_id
             where fm.usuario_id = p.id
               and fm.familia_id <> p_familia_id
               and fm.status = 'ativo'
               and f.status = 'ativa'
             order by case when fm.papel = 'administrador' then 0 else 1 end, fm.criado_em
             limit 1
       ),
       atualizado_em = now()
     where p.familia_atual_id = p_familia_id;

    select count(*)::integer
      into v_usuarios_sem_familia
      from public.perfis p
     where p.familia_atual_id is null
       and exists (
            select 1 from public.familia_membros fm
             where fm.familia_id = p_familia_id and fm.usuario_id = p.id
       );

    perform private.registrar_auditoria_admin(
        v_admin_id,
        'familia_excluida_definitivamente',
        'familia',
        p_familia_id,
        p_familia_id,
        null,
        'Família excluída definitivamente pelo Admin Geral.',
        v_resumo,
        jsonb_build_object('excluida', true),
        p_origem_ip,
        p_request_id
    );

    delete from public.familias where id = p_familia_id;

    return jsonb_build_object(
        'mensagem', 'Família excluída definitivamente.',
        'familia_id', p_familia_id,
        'familia_nome', v_familia.nome,
        'usuarios_sem_familia', v_usuarios_sem_familia,
        'resumo_excluido', v_resumo
    );
end;
$$;

-- ============================================================
-- Usuários e vínculos
-- ============================================================

create or replace function public.admin_listar_usuarios(
    p_busca text default null,
    p_limite integer default 50,
    p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_total integer;
    v_usuarios jsonb;
begin
    select count(*)::integer into v_total
      from public.perfis p
     where v_busca is null
        or private.normalizar_texto(p.nome) like '%' || private.normalizar_texto(v_busca) || '%'
        or lower(p.email) like '%' || lower(v_busca) || '%'
        or exists (
            select 1
              from public.familia_membros fm
              join public.familias f on f.id = fm.familia_id
             where fm.usuario_id = p.id
               and private.normalizar_texto(f.nome) like '%' || private.normalizar_texto(v_busca) || '%'
        );

    select coalesce(jsonb_agg(to_jsonb(x) order by x.ultima_atividade desc nulls last, x.nome), '[]'::jsonb)
      into v_usuarios
      from (
        select
            p.id,
            p.nome,
            p.email,
            p.criado_em,
            p.atualizado_em,
            p.familia_atual_id,
            coalesce(f.nome, 'Sem família atual') as familia_atual_nome,
            coalesce(f.status, 'sem_familia') as familia_atual_status,
            private.usuario_admin_sistema(p.id) as admin_geral,
            (select count(*)::integer from public.familia_membros fm where fm.usuario_id = p.id and fm.status = 'ativo') as familias_count,
            greatest(
                p.atualizado_em,
                (select max(fm.atualizado_em) from public.familia_membros fm where fm.usuario_id = p.id),
                (select max(c.criado_em) from public.compras c where c.criado_por = p.id)
            ) as ultima_atividade
          from public.perfis p
          left join public.familias f on f.id = p.familia_atual_id
         where v_busca is null
            or private.normalizar_texto(p.nome) like '%' || private.normalizar_texto(v_busca) || '%'
            or lower(p.email) like '%' || lower(v_busca) || '%'
            or exists (
                select 1
                  from public.familia_membros fm
                  join public.familias fx on fx.id = fm.familia_id
                 where fm.usuario_id = p.id
                   and private.normalizar_texto(fx.nome) like '%' || private.normalizar_texto(v_busca) || '%'
            )
         order by ultima_atividade desc nulls last, p.nome
         limit v_limite offset v_offset
      ) x;

    return jsonb_build_object(
        'usuarios', v_usuarios,
        'total', v_total,
        'limite', v_limite,
        'offset', v_offset,
        'tem_mais', v_offset + jsonb_array_length(v_usuarios) < v_total,
        'administrador_id', v_admin_id
    );
end;
$$;

create or replace function public.admin_detalhar_usuario(p_usuario_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_usuario jsonb;
    v_familias jsonb;
begin
    select jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'email', p.email,
        'criado_em', p.criado_em,
        'atualizado_em', p.atualizado_em,
        'familia_atual_id', p.familia_atual_id,
        'admin_geral', private.usuario_admin_sistema(p.id)
    ) into v_usuario
      from public.perfis p
     where p.id = p_usuario_id;

    if v_usuario is null then
        raise exception using errcode = 'P0002', message = 'Usuário não encontrado.';
    end if;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.familia_nome), '[]'::jsonb)
      into v_familias
      from (
        select
            f.id as familia_id,
            f.nome as familia_nome,
            f.status as familia_status,
            fm.papel,
            fm.status,
            fm.criado_em,
            (f.id = (select familia_atual_id from public.perfis where id = p_usuario_id)) as familia_atual
          from public.familia_membros fm
          join public.familias f on f.id = fm.familia_id
         where fm.usuario_id = p_usuario_id
      ) x;

    return jsonb_build_object(
        'usuario', v_usuario,
        'familias', v_familias,
        'administrador_id', v_admin_id
    );
end;
$$;

create or replace function public.admin_alterar_papel_membro(
    p_familia_id uuid,
    p_usuario_id uuid,
    p_papel text,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_papel text := lower(trim(coalesce(p_papel, '')));
    v_anterior text;
    v_nome text;
begin
    if v_papel not in ('administrador', 'membro') then
        raise exception using errcode = '22023', message = 'Papel inválido.';
    end if;

    select fm.papel, p.nome into v_anterior, v_nome
      from public.familia_membros fm
      join public.perfis p on p.id = fm.usuario_id
     where fm.familia_id = p_familia_id
       and fm.usuario_id = p_usuario_id
       and fm.status = 'ativo'
     for update of fm;

    if not found then
        raise exception using errcode = 'P0002', message = 'Membro não encontrado nessa família.';
    end if;

    if v_anterior = 'administrador' and v_papel = 'membro'
       and not exists (
            select 1 from public.familia_membros fm
             where fm.familia_id = p_familia_id
               and fm.usuario_id <> p_usuario_id
               and fm.status = 'ativo'
               and fm.papel = 'administrador'
       ) then
        raise exception using errcode = 'P0001', message = 'A família precisa manter pelo menos um administrador.';
    end if;

    update public.familia_membros
       set papel = v_papel, atualizado_em = now()
     where familia_id = p_familia_id and usuario_id = p_usuario_id;

    perform private.registrar_auditoria_admin(
        v_admin_id,
        'papel_membro_alterado',
        'membro',
        p_usuario_id,
        p_familia_id,
        p_usuario_id,
        'Papel do membro alterado pelo Admin Geral.',
        jsonb_build_object('papel', v_anterior, 'nome', v_nome),
        jsonb_build_object('papel', v_papel),
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object('mensagem', 'Papel atualizado com sucesso.', 'papel', v_papel);
end;
$$;

create or replace function public.admin_remover_membro_familia(
    p_familia_id uuid,
    p_usuario_id uuid,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_membro record;
    v_membros_count integer;
    v_proxima_familia_id uuid;
begin
    select fm.papel, p.nome, p.email, p.familia_atual_id
      into v_membro
      from public.familia_membros fm
      join public.perfis p on p.id = fm.usuario_id
     where fm.familia_id = p_familia_id
       and fm.usuario_id = p_usuario_id
       and fm.status = 'ativo'
     for update of fm;

    if not found then
        raise exception using errcode = 'P0002', message = 'Membro não encontrado nessa família.';
    end if;

    if p_usuario_id = v_admin_id then
        raise exception using
            errcode = 'P0001',
            message = 'O Admin Geral não pode remover o próprio vínculo por este painel. Use os ajustes da família.';
    end if;

    select count(*)::integer into v_membros_count
      from public.familia_membros
     where familia_id = p_familia_id and status = 'ativo';

    if v_membros_count <= 1 then
        raise exception using errcode = 'P0001', message = 'Use a exclusão definitiva da família para remover seu último membro.';
    end if;

    if v_membro.papel = 'administrador'
       and not exists (
            select 1 from public.familia_membros fm
             where fm.familia_id = p_familia_id
               and fm.usuario_id <> p_usuario_id
               and fm.status = 'ativo'
               and fm.papel = 'administrador'
       ) then
        raise exception using errcode = 'P0001', message = 'Promova outro administrador antes de remover este membro.';
    end if;

    if v_membro.familia_atual_id = p_familia_id then
        select fm.familia_id into v_proxima_familia_id
          from public.familia_membros fm
          join public.familias f on f.id = fm.familia_id
         where fm.usuario_id = p_usuario_id
           and fm.familia_id <> p_familia_id
           and fm.status = 'ativo'
           and f.status = 'ativa'
         order by case when fm.papel = 'administrador' then 0 else 1 end, fm.criado_em
         limit 1;

        update public.perfis
           set familia_atual_id = v_proxima_familia_id,
               atualizado_em = now()
         where id = p_usuario_id;
    end if;

    delete from public.familia_membros
     where familia_id = p_familia_id and usuario_id = p_usuario_id;

    perform private.registrar_auditoria_admin(
        v_admin_id,
        'membro_removido',
        'membro',
        p_usuario_id,
        p_familia_id,
        p_usuario_id,
        'Membro removido da família pelo Admin Geral.',
        jsonb_build_object('nome', v_membro.nome, 'email', v_membro.email, 'papel', v_membro.papel),
        jsonb_build_object('removido', true, 'proxima_familia_id', v_proxima_familia_id),
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object('mensagem', 'Membro removido da família.', 'proxima_familia_id', v_proxima_familia_id);
end;
$$;

create or replace function public.admin_preparar_redefinicao_usuario(
    p_usuario_id uuid,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_usuario record;
begin
    select p.nome, p.email into v_usuario
      from public.perfis p
     where p.id = p_usuario_id;

    if not found then
        raise exception using errcode = 'P0002', message = 'Usuário não encontrado.';
    end if;

    perform private.registrar_auditoria_admin(
        v_admin_id,
        'redefinicao_senha_solicitada',
        'usuario',
        p_usuario_id,
        null,
        p_usuario_id,
        'E-mail de redefinição de senha solicitado pelo Admin Geral.',
        jsonb_build_object('nome', v_usuario.nome, 'email', v_usuario.email),
        '{}'::jsonb,
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object('usuario_id', p_usuario_id, 'nome', v_usuario.nome, 'email', v_usuario.email);
end;
$$;

create or replace function public.admin_preparar_exclusao_usuario(
    p_usuario_id uuid,
    p_email_confirmacao text,
    p_confirmacao text,
    p_motivo text,
    p_origem_ip text default null,
    p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_usuario record;
    v_familias_bloqueadas text;
    v_familias_exclusivas integer := 0;
    v_auditoria_id uuid;
begin
    if p_usuario_id = v_admin_id then
        raise exception using errcode = 'P0001', message = 'Use a área da própria conta para excluir seu usuário.';
    end if;

    select p.nome, p.email into v_usuario
      from public.perfis p
     where p.id = p_usuario_id
     for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Usuário não encontrado.';
    end if;

    if private.usuario_admin_sistema(p_usuario_id) then
        raise exception using errcode = 'P0001', message = 'Remova primeiro a permissão de Admin Geral desse usuário.';
    end if;

    if lower(trim(coalesce(p_email_confirmacao, ''))) <> lower(trim(v_usuario.email)) then
        raise exception using errcode = '22023', message = 'Digite exatamente o e-mail do usuário.';
    end if;
    if trim(coalesce(p_confirmacao, '')) <> 'EXCLUIR DEFINITIVAMENTE' then
        raise exception using errcode = '22023', message = 'Digite EXCLUIR DEFINITIVAMENTE para confirmar.';
    end if;
    if char_length(trim(coalesce(p_motivo, ''))) < 3 then
        raise exception using errcode = '22023', message = 'Informe o motivo da exclusão.';
    end if;

    select string_agg(f.nome, ', ' order by f.nome)
      into v_familias_bloqueadas
      from public.familia_membros fm
      join public.familias f on f.id = fm.familia_id
     where fm.usuario_id = p_usuario_id
       and fm.status = 'ativo'
       and fm.papel = 'administrador'
       and exists (
            select 1 from public.familia_membros outro
             where outro.familia_id = fm.familia_id
               and outro.usuario_id <> p_usuario_id
               and outro.status = 'ativo'
       )
       and not exists (
            select 1 from public.familia_membros outro_admin
             where outro_admin.familia_id = fm.familia_id
               and outro_admin.usuario_id <> p_usuario_id
               and outro_admin.status = 'ativo'
               and outro_admin.papel = 'administrador'
       );

    if v_familias_bloqueadas is not null then
        raise exception using
            errcode = 'P0001',
            message = 'Promova outro administrador antes de excluir o usuário em: ' || v_familias_bloqueadas || '.';
    end if;

    select count(*)::integer into v_familias_exclusivas
      from public.familia_membros fm
     where fm.usuario_id = p_usuario_id
       and fm.status = 'ativo'
       and not exists (
            select 1 from public.familia_membros outro
             where outro.familia_id = fm.familia_id
               and outro.usuario_id <> p_usuario_id
               and outro.status = 'ativo'
       );

    v_auditoria_id := private.registrar_auditoria_admin(
        v_admin_id,
        'usuario_exclusao_iniciada',
        'usuario',
        p_usuario_id,
        null,
        p_usuario_id,
        'Exclusão definitiva de usuário iniciada pelo Admin Geral.',
        jsonb_build_object(
            'nome', v_usuario.nome,
            'email', v_usuario.email,
            'familias_count', (select count(*)::integer from public.familia_membros where usuario_id = p_usuario_id and status = 'ativo'),
            'familias_exclusivas_count', v_familias_exclusivas,
            'motivo', trim(p_motivo)
        ),
        jsonb_build_object('status', 'aguardando_exclusao_auth'),
        p_origem_ip,
        p_request_id
    );

    return jsonb_build_object(
        'pode_excluir', true,
        'usuario_id', p_usuario_id,
        'nome', v_usuario.nome,
        'email', v_usuario.email,
        'familias_exclusivas_count', v_familias_exclusivas,
        'auditoria_id', v_auditoria_id
    );
end;
$$;

create or replace function public.admin_finalizar_exclusao_usuario(
    p_usuario_id uuid,
    p_auditoria_id uuid,
    p_sucesso boolean,
    p_detalhe text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
begin
    if p_sucesso then
        -- Também cobre o caso raro em que o usuário já não existe no Auth,
        -- mas ainda há resíduos públicos.
        delete from public.aceites_legais where usuario_id = p_usuario_id;
        delete from public.familia_membros where usuario_id = p_usuario_id;
        delete from public.perfis where id = p_usuario_id;
        delete from public.administradores_sistema where usuario_id = p_usuario_id;

        update public.auditoria_admin_geral
           set acao = 'usuario_excluido_definitivamente',
               resumo = 'Usuário excluído definitivamente pelo Admin Geral.',
               dados_novos = jsonb_build_object('excluido', true, 'detalhe', coalesce(p_detalhe, ''))
         where id = p_auditoria_id
           and administrador_id = v_admin_id;

        return jsonb_build_object('mensagem', 'Usuário excluído definitivamente.', 'usuario_id', p_usuario_id);
    end if;

    update public.auditoria_admin_geral
       set acao = 'usuario_exclusao_falhou',
           resumo = 'A exclusão definitiva do usuário falhou.',
           dados_novos = jsonb_build_object('excluido', false, 'detalhe', coalesce(p_detalhe, ''))
     where id = p_auditoria_id
       and administrador_id = v_admin_id;

    return jsonb_build_object('mensagem', 'Falha registrada na auditoria.', 'usuario_id', p_usuario_id);
end;
$$;

-- ============================================================
-- Auditoria
-- ============================================================

create or replace function public.admin_listar_auditoria(
    p_busca text default null,
    p_limite integer default 100,
    p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := private.exigir_admin_sistema();
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_limite integer := least(greatest(coalesce(p_limite, 100), 1), 300);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_total integer;
    v_registros jsonb;
begin
    select count(*)::integer into v_total
      from public.auditoria_admin_geral a
     where v_busca is null
        or private.normalizar_texto(a.acao || ' ' || a.resumo || ' ' || a.entidade)
           like '%' || private.normalizar_texto(v_busca) || '%';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.criado_em desc), '[]'::jsonb)
      into v_registros
      from (
        select
            a.id,
            a.acao,
            a.entidade,
            a.entidade_id,
            a.familia_id,
            a.usuario_alvo_id,
            a.resumo,
            a.dados_anteriores,
            a.dados_novos,
            a.origem_ip,
            a.request_id,
            a.criado_em,
            coalesce(p.nome, 'Administrador removido') as administrador_nome,
            coalesce(p.email, '') as administrador_email
          from public.auditoria_admin_geral a
          left join public.perfis p on p.id = a.administrador_id
         where v_busca is null
            or private.normalizar_texto(a.acao || ' ' || a.resumo || ' ' || a.entidade)
               like '%' || private.normalizar_texto(v_busca) || '%'
         order by a.criado_em desc
         limit v_limite offset v_offset
      ) x;

    return jsonb_build_object(
        'registros', v_registros,
        'total', v_total,
        'limite', v_limite,
        'offset', v_offset,
        'tem_mais', v_offset + jsonb_array_length(v_registros) < v_total,
        'administrador_id', v_admin_id
    );
end;
$$;

-- ============================================================
-- Permissões de execução
-- ============================================================

revoke all on function public.meu_acesso_admin_geral() from public, anon;
grant execute on function public.meu_acesso_admin_geral() to authenticated;

revoke all on function public.admin_resumo_sistema() from public, anon;
grant execute on function public.admin_resumo_sistema() to authenticated;
revoke all on function public.admin_listar_familias(text, text, integer, integer) from public, anon;
grant execute on function public.admin_listar_familias(text, text, integer, integer) to authenticated;
revoke all on function public.admin_detalhar_familia(uuid) from public, anon;
grant execute on function public.admin_detalhar_familia(uuid) to authenticated;
revoke all on function public.admin_atualizar_familia(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_atualizar_familia(uuid, text, text, text, text) to authenticated;
revoke all on function public.admin_alterar_status_familia(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_alterar_status_familia(uuid, text, text, text, text) to authenticated;
revoke all on function public.admin_excluir_familia_definitivamente(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_excluir_familia_definitivamente(uuid, text, text, text, text, text) to authenticated;

revoke all on function public.admin_listar_usuarios(text, integer, integer) from public, anon;
grant execute on function public.admin_listar_usuarios(text, integer, integer) to authenticated;
revoke all on function public.admin_detalhar_usuario(uuid) from public, anon;
grant execute on function public.admin_detalhar_usuario(uuid) to authenticated;
revoke all on function public.admin_alterar_papel_membro(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.admin_alterar_papel_membro(uuid, uuid, text, text, text) to authenticated;
revoke all on function public.admin_remover_membro_familia(uuid, uuid, text, text) from public, anon;
grant execute on function public.admin_remover_membro_familia(uuid, uuid, text, text) to authenticated;
revoke all on function public.admin_preparar_redefinicao_usuario(uuid, text, text) from public, anon;
grant execute on function public.admin_preparar_redefinicao_usuario(uuid, text, text) to authenticated;
revoke all on function public.admin_preparar_exclusao_usuario(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_preparar_exclusao_usuario(uuid, text, text, text, text, text) to authenticated;
revoke all on function public.admin_finalizar_exclusao_usuario(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.admin_finalizar_exclusao_usuario(uuid, uuid, boolean, text) to authenticated;

revoke all on function public.admin_listar_auditoria(text, integer, integer) from public, anon;
grant execute on function public.admin_listar_auditoria(text, integer, integer) to authenticated;

commit;
