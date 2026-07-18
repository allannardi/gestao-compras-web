-- Gestão de Compras Web v0.6.3 — Fundação Premium e seletor de histórico
-- Execute depois de 009_senhas_seguranca.sql.

begin;

-- ============================================================
-- 1. Catálogo interno de licenças
-- ============================================================

create table if not exists public.planos_licenca (
    codigo text primary key
        check (codigo in ('free', 'premium')),
    nome text not null,
    limite_usuarios_padrao integer not null
        check (limite_usuarios_padrao > 0),
    recursos jsonb not null default '{}'::jsonb,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

insert into public.planos_licenca (
    codigo,
    nome,
    limite_usuarios_padrao,
    recursos
)
values
    (
        'free',
        'Gratuita',
        2,
        jsonb_build_object(
            'membros_adicionais', false,
            'exportacao_avancada', false,
            'recursos_premium', false
        )
    ),
    (
        'premium',
        'Premium',
        5,
        jsonb_build_object(
            'membros_adicionais', true,
            'exportacao_avancada', true,
            'recursos_premium', true
        )
    )
on conflict (codigo) do update
set
    nome = excluded.nome,
    limite_usuarios_padrao = excluded.limite_usuarios_padrao,
    recursos = excluded.recursos,
    ativo = true,
    atualizado_em = now();

alter table public.familias
    add column if not exists licenca_status text
        not null default 'ativa'
        check (licenca_status in ('ativa', 'teste', 'suspensa', 'cancelada'));

alter table public.familias
    add column if not exists licenca_expira_em timestamptz;

alter table public.configuracoes_familia
    add column if not exists recursos_habilitados jsonb
        not null default '{}'::jsonb;

update public.configuracoes_familia cf
   set recursos_habilitados = pl.recursos,
       atualizado_em = now()
  from public.familias f
  join public.planos_licenca pl
    on pl.codigo = f.plano
 where cf.familia_id = f.id
   and cf.recursos_habilitados = '{}'::jsonb;

alter table public.planos_licenca enable row level security;

-- Nenhuma tela ou usuário autenticado pode mudar a licença diretamente.
revoke all on table public.planos_licenca from public, anon, authenticated;

-- Função reservada para futura administração comercial do sistema.
create or replace function private.definir_licenca_familia(
    p_familia_id uuid,
    p_plano text,
    p_limite_usuarios integer default null,
    p_recursos_adicionais jsonb default '{}'::jsonb,
    p_expira_em timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_plano public.planos_licenca%rowtype;
    v_limite integer;
    v_recursos jsonb;
begin
    select *
      into v_plano
      from public.planos_licenca
     where codigo = lower(trim(coalesce(p_plano, '')))
       and ativo = true
     limit 1;

    if not found then
        raise exception using
            errcode = '22023',
            message = 'Plano de licença inválido ou inativo.';
    end if;

    if not exists (
        select 1
          from public.familias f
         where f.id = p_familia_id
    ) then
        raise exception using
            errcode = 'P0002',
            message = 'Família não encontrada.';
    end if;

    v_limite := coalesce(p_limite_usuarios, v_plano.limite_usuarios_padrao);

    if v_limite < 1 then
        raise exception using
            errcode = '22023',
            message = 'O limite de usuários precisa ser maior que zero.';
    end if;

    v_recursos := v_plano.recursos || coalesce(p_recursos_adicionais, '{}'::jsonb);

    update public.familias
       set plano = v_plano.codigo,
           licenca_status = 'ativa',
           licenca_expira_em = p_expira_em,
           atualizado_em = now()
     where id = p_familia_id;

    insert into public.configuracoes_familia (
        familia_id,
        limite_usuarios,
        recursos_habilitados
    )
    values (
        p_familia_id,
        v_limite,
        v_recursos
    )
    on conflict (familia_id) do update
       set limite_usuarios = excluded.limite_usuarios,
           recursos_habilitados = excluded.recursos_habilitados,
           atualizado_em = now();

    return jsonb_build_object(
        'familia_id', p_familia_id,
        'plano', v_plano.codigo,
        'licenca_status', 'ativa',
        'limite_usuarios', v_limite,
        'recursos_habilitados', v_recursos,
        'licenca_expira_em', p_expira_em
    );
end;
$$;

-- Helper para futuras funcionalidades Premium, sempre respeitando a família do usuário.
create or replace function private.familia_tem_recurso(
    p_familia_id uuid,
    p_recurso text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        private.usuario_pertence_familia(p_familia_id)
        and coalesce(
            (
                select (cf.recursos_habilitados ->> p_recurso)::boolean
                  from public.configuracoes_familia cf
                 where cf.familia_id = p_familia_id
            ),
            false
        );
$$;

revoke all on function private.definir_licenca_familia(
    uuid,
    text,
    integer,
    jsonb,
    timestamptz
) from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.definir_licenca_familia(
    uuid,
    text,
    integer,
    jsonb,
    timestamptz
) to service_role;

revoke all on function private.familia_tem_recurso(uuid, text)
    from public, anon;
grant execute on function private.familia_tem_recurso(uuid, text)
    to authenticated, service_role;

-- ============================================================
-- 2. Histórico de preços: até 200 produtos no seletor
-- ============================================================

create or replace function public.buscar_produtos_historico_familia(
    p_busca text default null,
    p_limite integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_limite integer := least(greatest(coalesce(p_limite, 200), 1), 200);
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar o histórico de preços.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
      join public.familia_membros fm
        on fm.familia_id = p.familia_atual_id
       and fm.usuario_id = p.id
       and fm.status = 'ativo'
     where p.id = v_usuario_id
     limit 1;

    if v_familia_id is null then
        raise exception using
            errcode = 'P0001',
            message = 'A família do usuário não foi encontrada.';
    end if;

    select coalesce(
        jsonb_agg(
            to_jsonb(r)
            order by r.ultima_compra desc nulls last, r.nome asc
        ),
        '[]'::jsonb
    )
      into v_resultado
      from (
        select
            p.id,
            p.nome,
            coalesce(p.marca, '')::text as marca,
            p.unidade_padrao,
            coalesce(cat.nome, 'Não classificado')::text as categoria_nome,
            count(h.id)::integer as registros_count,
            max(h.data_compra) as ultima_compra,
            (
                select h2.valor_unitario
                  from public.historico_precos h2
                 where h2.familia_id = v_familia_id
                   and h2.produto_id = p.id
                 order by h2.data_compra desc, h2.criado_em desc
                 limit 1
            ) as ultimo_valor_unitario
          from public.produtos p
          left join public.categorias cat
            on cat.id = p.categoria_id
           and cat.familia_id = v_familia_id
          join public.historico_precos h
            on h.produto_id = p.id
           and h.familia_id = v_familia_id
         where p.familia_id = v_familia_id
           and p.ativo = true
           and (
                v_busca is null
                or lower(p.nome) like '%' || lower(v_busca) || '%'
                or lower(coalesce(p.marca, '')) like '%' || lower(v_busca) || '%'
           )
         group by
            p.id,
            p.nome,
            p.marca,
            p.unidade_padrao,
            cat.nome
         order by ultima_compra desc nulls last, p.nome asc
         limit v_limite
      ) r;

    return v_resultado;
end;
$$;

revoke all on function public.buscar_produtos_historico_familia(text, integer)
    from public, anon;
grant execute on function public.buscar_produtos_historico_familia(text, integer)
    to authenticated;

commit;
