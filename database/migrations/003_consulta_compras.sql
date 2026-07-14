begin;

-- ============================================================
-- v0.3.2 — Listagem e detalhes de compras por família
-- Execute depois de 001_fundacao_familias.sql e 002_compras_nfce.sql.
-- ============================================================

create or replace function public.listar_compras_familia(
    p_limite integer default 30,
    p_offset integer default 0
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
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar as compras.';
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
     order by c.data_compra desc, c.criado_em desc
     limit v_limite
    offset v_offset;
end;
$$;

create or replace function public.detalhar_compra_familia(p_compra_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar a compra.';
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

    select jsonb_build_object(
        'id', c.id,
        'familia_id', c.familia_id,
        'supermercado_id', c.supermercado_id,
        'supermercado_nome', coalesce(s.nome, 'Mercado não identificado'),
        'supermercado_cnpj', coalesce(s.cnpj, ''),
        'chave_nfce', coalesce(c.chave_nfce, ''),
        'data_compra', c.data_compra,
        'valor_total', c.valor_total,
        'forma_pagamento', coalesce(c.forma_pagamento, ''),
        'valor_pago', c.valor_pago,
        'origem', c.origem,
        'status', c.status,
        'criado_em', c.criado_em,
        'itens', (
            select coalesce(
                jsonb_agg(
                    jsonb_build_object(
                        'id', i.id,
                        'produto_id', i.produto_id,
                        'produto_nome', coalesce(p.nome, i.descricao_original),
                        'descricao_original', i.descricao_original,
                        'quantidade', i.quantidade,
                        'unidade', i.unidade,
                        'valor_unitario', i.valor_unitario,
                        'valor_total', i.valor_total,
                        'categoria_nome', coalesce(cat.nome, 'Não classificado')
                    )
                    order by i.criado_em, i.id
                ),
                '[]'::jsonb
            )
              from public.itens_compra i
              left join public.produtos p
                on p.id = i.produto_id
               and p.familia_id = v_familia_id
              left join public.categorias cat
                on cat.id = p.categoria_id
               and cat.familia_id = v_familia_id
             where i.familia_id = v_familia_id
               and i.compra_id = c.id
        )
    )
      into v_resultado
      from public.compras c
      left join public.supermercados s
        on s.id = c.supermercado_id
       and s.familia_id = v_familia_id
     where c.id = p_compra_id
       and c.familia_id = v_familia_id
     limit 1;

    if v_resultado is null then
        raise exception using
            errcode = 'P0002',
            message = 'Compra não encontrada nesta família.';
    end if;

    return v_resultado;
end;
$$;

revoke all on function public.listar_compras_familia(integer, integer) from public, anon;
revoke all on function public.detalhar_compra_familia(uuid) from public, anon;
grant execute on function public.listar_compras_familia(integer, integer) to authenticated;
grant execute on function public.detalhar_compra_familia(uuid) to authenticated;

commit;
