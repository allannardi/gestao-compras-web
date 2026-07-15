begin;

-- ============================================================
-- v0.5.0 — Dashboard, histórico de preços e filtro por mercado
-- Execute depois de 005_produtos_classificacao.sql.
-- ============================================================

-- O filtro de compras passa a receber um supermercado existente,
-- evitando textos livres e mantendo a seleção restrita à família.
drop function if exists public.listar_compras_familia(integer, integer, text, date);

create function public.listar_compras_familia(
    p_limite integer default 30,
    p_offset integer default 0,
    p_supermercado_id uuid default null,
    p_mes date default null
)
returns table (
    id uuid,
    supermercado_nome text,
    data_compra date,
    valor_total numeric,
    forma_pagamento text,
    status text,
    itens_count bigint,
    criado_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_limite integer := least(greatest(coalesce(p_limite, 30), 1), 101);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_mes_inicio date := case
        when p_mes is null then null
        else date_trunc('month', p_mes::timestamp)::date
    end;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar as compras.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    if p_supermercado_id is not null and not exists (
        select 1
          from public.supermercados s
         where s.id = p_supermercado_id
           and s.familia_id = v_familia_id
           and s.ativo = true
    ) then
        raise exception using errcode = 'P0002', message = 'Supermercado não encontrado nesta família.';
    end if;

    return query
    select
        c.id,
        coalesce(s.nome, 'Mercado não identificado')::text as supermercado_nome,
        c.data_compra,
        c.valor_total,
        coalesce(c.forma_pagamento, '')::text as forma_pagamento,
        c.status::text,
        (
            select count(*)
              from public.itens_compra i
             where i.familia_id = v_familia_id
               and i.compra_id = c.id
        ) as itens_count,
        c.criado_em
      from public.compras c
      left join public.supermercados s
        on s.id = c.supermercado_id
       and s.familia_id = v_familia_id
     where c.familia_id = v_familia_id
       and (p_supermercado_id is null or c.supermercado_id = p_supermercado_id)
       and (
            v_mes_inicio is null
            or (
                c.data_compra >= v_mes_inicio
                and c.data_compra < (v_mes_inicio + interval '1 month')::date
            )
       )
     order by c.data_compra desc, c.criado_em desc
     limit v_limite
    offset v_offset;
end;
$$;

create or replace function public.listar_supermercados_familia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar os supermercados.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'nome', s.nome,
                'cnpj', coalesce(s.cnpj, ''),
                'compras_count', (
                    select count(*)
                      from public.compras c
                     where c.familia_id = v_familia_id
                       and c.supermercado_id = s.id
                       and c.status = 'confirmada'
                ),
                'valor_total', (
                    select coalesce(sum(c.valor_total), 0)
                      from public.compras c
                     where c.familia_id = v_familia_id
                       and c.supermercado_id = s.id
                       and c.status = 'confirmada'
                )
            ) order by s.nome asc
        ),
        '[]'::jsonb
    )
      into v_resultado
      from public.supermercados s
     where s.familia_id = v_familia_id
       and s.ativo = true
       and exists (
            select 1
              from public.compras c
             where c.familia_id = v_familia_id
               and c.supermercado_id = s.id
       );

    return v_resultado;
end;
$$;

create or replace function public.obter_dashboard_familia(p_mes date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_mes_inicio date := date_trunc('month', coalesce(p_mes, current_date)::timestamp)::date;
    v_mes_fim date := (date_trunc('month', coalesce(p_mes, current_date)::timestamp) + interval '1 month')::date;
    v_mes_anterior_inicio date := (date_trunc('month', coalesce(p_mes, current_date)::timestamp) - interval '1 month')::date;
    v_total numeric := 0;
    v_total_anterior numeric := 0;
    v_compras_count integer := 0;
    v_itens_count bigint := 0;
    v_ticket_medio numeric := 0;
    v_variacao numeric;
    v_top_produtos jsonb;
    v_top_categorias jsonb;
    v_top_supermercados jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar o dashboard.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    select
        coalesce(sum(c.valor_total), 0),
        count(*)::integer
      into v_total, v_compras_count
      from public.compras c
     where c.familia_id = v_familia_id
       and c.status = 'confirmada'
       and c.data_compra >= v_mes_inicio
       and c.data_compra < v_mes_fim;

    select count(*)
      into v_itens_count
      from public.itens_compra i
      join public.compras c
        on c.id = i.compra_id
       and c.familia_id = v_familia_id
       and c.status = 'confirmada'
     where i.familia_id = v_familia_id
       and c.data_compra >= v_mes_inicio
       and c.data_compra < v_mes_fim;

    select coalesce(sum(c.valor_total), 0)
      into v_total_anterior
      from public.compras c
     where c.familia_id = v_familia_id
       and c.status = 'confirmada'
       and c.data_compra >= v_mes_anterior_inicio
       and c.data_compra < v_mes_inicio;

    v_ticket_medio := case
        when v_compras_count = 0 then 0
        else round(v_total / v_compras_count, 2)
    end;

    v_variacao := case
        when v_total_anterior > 0 then round(((v_total - v_total_anterior) / v_total_anterior) * 100, 2)
        when v_total > 0 then null
        else 0
    end;

    select coalesce(
        jsonb_agg(to_jsonb(r) order by r.valor_total desc, r.nome asc),
        '[]'::jsonb
    )
      into v_top_produtos
      from (
        select
            p.id,
            p.nome,
            coalesce(p.marca, '')::text as marca,
            p.unidade_padrao,
            round(sum(i.quantidade), 3) as quantidade,
            round(sum(i.valor_total), 2) as valor_total,
            count(distinct i.compra_id)::integer as compras_count
          from public.itens_compra i
          join public.compras c
            on c.id = i.compra_id
           and c.familia_id = v_familia_id
           and c.status = 'confirmada'
          join public.produtos p
            on p.id = i.produto_id
           and p.familia_id = v_familia_id
         where i.familia_id = v_familia_id
           and c.data_compra >= v_mes_inicio
           and c.data_compra < v_mes_fim
         group by p.id, p.nome, p.marca, p.unidade_padrao
         order by valor_total desc, p.nome asc
         limit 5
      ) r;

    select coalesce(
        jsonb_agg(to_jsonb(r) order by r.valor_total desc, r.nome asc),
        '[]'::jsonb
    )
      into v_top_categorias
      from (
        select
            coalesce(cat.id, '00000000-0000-0000-0000-000000000000'::uuid) as id,
            coalesce(cat.nome, 'Não classificado')::text as nome,
            round(sum(i.valor_total), 2) as valor_total,
            count(distinct i.compra_id)::integer as compras_count,
            count(distinct i.produto_id)::integer as produtos_count
          from public.itens_compra i
          join public.compras c
            on c.id = i.compra_id
           and c.familia_id = v_familia_id
           and c.status = 'confirmada'
          left join public.produtos p
            on p.id = i.produto_id
           and p.familia_id = v_familia_id
          left join public.categorias cat
            on cat.id = p.categoria_id
           and cat.familia_id = v_familia_id
         where i.familia_id = v_familia_id
           and c.data_compra >= v_mes_inicio
           and c.data_compra < v_mes_fim
         group by cat.id, cat.nome
         order by valor_total desc, nome asc
         limit 5
      ) r;

    select coalesce(
        jsonb_agg(to_jsonb(r) order by r.valor_total desc, r.nome asc),
        '[]'::jsonb
    )
      into v_top_supermercados
      from (
        select
            coalesce(s.id, '00000000-0000-0000-0000-000000000000'::uuid) as id,
            coalesce(s.nome, 'Mercado não identificado')::text as nome,
            round(sum(c.valor_total), 2) as valor_total,
            count(*)::integer as compras_count
          from public.compras c
          left join public.supermercados s
            on s.id = c.supermercado_id
           and s.familia_id = v_familia_id
         where c.familia_id = v_familia_id
           and c.status = 'confirmada'
           and c.data_compra >= v_mes_inicio
           and c.data_compra < v_mes_fim
         group by s.id, s.nome
         order by valor_total desc, nome asc
         limit 5
      ) r;

    return jsonb_build_object(
        'mes', v_mes_inicio,
        'resumo', jsonb_build_object(
            'valor_total', round(v_total, 2),
            'compras_count', v_compras_count,
            'itens_count', v_itens_count,
            'ticket_medio', round(v_ticket_medio, 2),
            'valor_mes_anterior', round(v_total_anterior, 2),
            'variacao_percentual', v_variacao
        ),
        'top_produtos', v_top_produtos,
        'top_categorias', v_top_categorias,
        'top_supermercados', v_top_supermercados
    );
end;
$$;

create or replace function public.buscar_produtos_historico_familia(
    p_busca text default null,
    p_limite integer default 20
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
    v_limite integer := least(greatest(coalesce(p_limite, 20), 1), 50);
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar o histórico de preços.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    select coalesce(
        jsonb_agg(to_jsonb(r) order by r.ultima_compra desc nulls last, r.nome asc),
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
         group by p.id, p.nome, p.marca, p.unidade_padrao, cat.nome
         order by ultima_compra desc nulls last, p.nome asc
         limit v_limite
      ) r;

    return v_resultado;
end;
$$;

create or replace function public.obter_historico_produto_familia(
    p_produto_id uuid,
    p_limite integer default 30
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
    v_limite integer := least(greatest(coalesce(p_limite, 30), 2), 100);
    v_produto jsonb;
    v_pontos jsonb;
    v_registros integer := 0;
    v_menor numeric := 0;
    v_maior numeric := 0;
    v_primeiro numeric := 0;
    v_ultimo numeric := 0;
    v_variacao numeric := 0;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar o histórico de preços.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    select jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'marca', coalesce(p.marca, ''),
        'unidade_padrao', p.unidade_padrao,
        'categoria_nome', coalesce(cat.nome, 'Não classificado')
    )
      into v_produto
      from public.produtos p
      left join public.categorias cat
        on cat.id = p.categoria_id
       and cat.familia_id = v_familia_id
     where p.id = p_produto_id
       and p.familia_id = v_familia_id
       and p.ativo = true
     limit 1;

    if v_produto is null then
        raise exception using errcode = 'P0002', message = 'Produto não encontrado nesta família.';
    end if;

    select
        count(*)::integer,
        coalesce(min(h.valor_unitario), 0),
        coalesce(max(h.valor_unitario), 0)
      into v_registros, v_menor, v_maior
      from public.historico_precos h
     where h.familia_id = v_familia_id
       and h.produto_id = p_produto_id;

    select h.valor_unitario
      into v_primeiro
      from public.historico_precos h
     where h.familia_id = v_familia_id
       and h.produto_id = p_produto_id
     order by h.data_compra asc, h.criado_em asc
     limit 1;

    select h.valor_unitario
      into v_ultimo
      from public.historico_precos h
     where h.familia_id = v_familia_id
       and h.produto_id = p_produto_id
     order by h.data_compra desc, h.criado_em desc
     limit 1;

    v_primeiro := coalesce(v_primeiro, 0);
    v_ultimo := coalesce(v_ultimo, 0);
    v_variacao := case
        when v_primeiro > 0 then round(((v_ultimo - v_primeiro) / v_primeiro) * 100, 2)
        else 0
    end;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', ponto.id,
                'compra_id', ponto.compra_id,
                'data_compra', ponto.data_compra,
                'valor_unitario', ponto.valor_unitario,
                'quantidade', ponto.quantidade,
                'unidade', ponto.unidade,
                'supermercado_nome', ponto.supermercado_nome
            ) order by ponto.data_compra asc, ponto.criado_em asc
        ),
        '[]'::jsonb
    )
      into v_pontos
      from (
        select
            h.id,
            h.compra_id,
            h.data_compra,
            h.valor_unitario,
            h.quantidade,
            h.unidade,
            h.criado_em,
            coalesce(s.nome, 'Mercado não identificado')::text as supermercado_nome
          from public.historico_precos h
          left join public.supermercados s
            on s.id = h.supermercado_id
           and s.familia_id = v_familia_id
         where h.familia_id = v_familia_id
           and h.produto_id = p_produto_id
         order by h.data_compra desc, h.criado_em desc
         limit v_limite
      ) ponto;

    return jsonb_build_object(
        'produto', v_produto,
        'resumo', jsonb_build_object(
            'registros_count', v_registros,
            'menor_valor', round(v_menor, 4),
            'maior_valor', round(v_maior, 4),
            'primeiro_valor', round(v_primeiro, 4),
            'ultimo_valor', round(v_ultimo, 4),
            'variacao_percentual', v_variacao
        ),
        'pontos', v_pontos
    );
end;
$$;

revoke all on function public.listar_compras_familia(integer, integer, uuid, date) from public, anon;
revoke all on function public.listar_supermercados_familia() from public, anon;
revoke all on function public.obter_dashboard_familia(date) from public, anon;
revoke all on function public.buscar_produtos_historico_familia(text, integer) from public, anon;
revoke all on function public.obter_historico_produto_familia(uuid, integer) from public, anon;

grant execute on function public.listar_compras_familia(integer, integer, uuid, date) to authenticated;
grant execute on function public.listar_supermercados_familia() to authenticated;
grant execute on function public.obter_dashboard_familia(date) to authenticated;
grant execute on function public.buscar_produtos_historico_familia(text, integer) to authenticated;
grant execute on function public.obter_historico_produto_familia(uuid, integer) to authenticated;

commit;
