begin;

-- ============================================================
-- v0.3.3 — Filtros, ordenação por valor e exclusão controlada
-- Execute depois de 003_consulta_compras.sql.
-- ============================================================

-- A listagem passa a aceitar busca por supermercado e filtro mensal.
drop function if exists public.listar_compras_familia(integer, integer);

create function public.listar_compras_familia(
    p_limite integer default 30,
    p_offset integer default 0,
    p_busca text default null,
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
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_mes_inicio date := case
        when p_mes is null then null
        else date_trunc('month', p_mes::timestamp)::date
    end;
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
       and (
            v_busca is null
            or lower(coalesce(s.nome, 'Mercado não identificado'))
               like '%' || lower(v_busca) || '%'
       )
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

-- Os itens dos detalhes passam a vir do maior para o menor valor total.
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
                    order by i.valor_total desc, i.descricao_original asc, i.id
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

-- Exclusão física controlada, destinada à remoção de compras de teste.
-- Itens e histórico de preços são removidos por cascade. Produtos,
-- categorias e supermercados permanecem cadastrados.
create or replace function public.excluir_compra_teste(
    p_compra_id uuid,
    p_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_papel text;
    v_itens_excluidos integer := 0;
    v_historicos_excluidos integer := 0;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para excluir uma compra.';
    end if;

    select p.familia_atual_id, fm.papel
      into v_familia_id, v_papel
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

    if v_papel <> 'administrador' then
        raise exception using
            errcode = '42501',
            message = 'Somente administradores podem excluir compras de teste.';
    end if;

    if upper(trim(coalesce(p_confirmacao, ''))) <> 'EXCLUIR' then
        raise exception using
            errcode = '22023',
            message = 'Digite EXCLUIR para confirmar a remoção da compra.';
    end if;

    if not exists (
        select 1
          from public.compras c
         where c.id = p_compra_id
           and c.familia_id = v_familia_id
    ) then
        raise exception using
            errcode = 'P0002',
            message = 'Compra não encontrada nesta família.';
    end if;

    select count(*)::integer
      into v_itens_excluidos
      from public.itens_compra i
     where i.compra_id = p_compra_id
       and i.familia_id = v_familia_id;

    select count(*)::integer
      into v_historicos_excluidos
      from public.historico_precos h
     where h.compra_id = p_compra_id
       and h.familia_id = v_familia_id;

    delete from public.compras c
     where c.id = p_compra_id
       and c.familia_id = v_familia_id;

    return jsonb_build_object(
        'compra_id', p_compra_id,
        'familia_id', v_familia_id,
        'itens_excluidos', v_itens_excluidos,
        'historicos_excluidos', v_historicos_excluidos,
        'mensagem', 'Compra de teste excluída com sucesso.'
    );
end;
$$;

revoke all on function public.listar_compras_familia(integer, integer, text, date) from public, anon;
revoke all on function public.detalhar_compra_familia(uuid) from public, anon;
revoke all on function public.excluir_compra_teste(uuid, text) from public, anon;

grant execute on function public.listar_compras_familia(integer, integer, text, date) to authenticated;
grant execute on function public.detalhar_compra_familia(uuid) to authenticated;
grant execute on function public.excluir_compra_teste(uuid, text) to authenticated;

commit;
