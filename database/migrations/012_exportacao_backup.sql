-- Gestão de Compras Web v0.7.0 — Exportação e backup manual
-- Execute depois de 011_categorias_supermercados.sql.

begin;

-- ============================================================
-- 1. Resumo leve da exportação
-- ============================================================

create or replace function public.obter_resumo_exportacao_familia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_papel text;
    v_familia_nome text;
    v_plano text;
    v_primeira_compra date;
    v_ultima_compra date;
    v_total_compras integer;
    v_total_itens integer;
    v_total_produtos integer;
    v_total_historicos integer;
    v_total_supermercados integer;
    v_total_categorias integer;
    v_valor_total numeric(16, 2);
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para exportar os dados.';
    end if;

    select
        p.familia_atual_id,
        fm.papel,
        f.nome,
        f.plano
      into
        v_familia_id,
        v_papel,
        v_familia_nome,
        v_plano
      from public.perfis p
      join public.familia_membros fm
        on fm.familia_id = p.familia_atual_id
       and fm.usuario_id = p.id
       and fm.status = 'ativo'
      join public.familias f
        on f.id = p.familia_atual_id
     where p.id = v_usuario_id
     limit 1;

    if v_familia_id is null then
        raise exception using
            errcode = 'P0001',
            message = 'A família atual do usuário não foi encontrada.';
    end if;

    if v_papel <> 'administrador' then
        raise exception using
            errcode = '42501',
            message = 'Somente administradores podem exportar todos os dados da família.';
    end if;

    select
        count(*)::integer,
        min(c.data_compra),
        max(c.data_compra),
        coalesce(sum(c.valor_total) filter (where c.status = 'confirmada'), 0)
      into
        v_total_compras,
        v_primeira_compra,
        v_ultima_compra,
        v_valor_total
      from public.compras c
     where c.familia_id = v_familia_id;

    select count(*)::integer
      into v_total_itens
      from public.itens_compra i
     where i.familia_id = v_familia_id;

    select count(*)::integer
      into v_total_produtos
      from public.produtos p
     where p.familia_id = v_familia_id;

    select count(*)::integer
      into v_total_historicos
      from public.historico_precos h
     where h.familia_id = v_familia_id;

    select count(*)::integer
      into v_total_supermercados
      from public.supermercados s
     where s.familia_id = v_familia_id;

    select count(*)::integer
      into v_total_categorias
      from public.categorias c
     where c.familia_id = v_familia_id;

    return jsonb_build_object(
        'familia_id', v_familia_id,
        'familia_nome', v_familia_nome,
        'plano', v_plano,
        'gerado_em', now(),
        'primeira_compra', v_primeira_compra,
        'ultima_compra', v_ultima_compra,
        'valor_total', coalesce(v_valor_total, 0),
        'compras_count', coalesce(v_total_compras, 0),
        'itens_count', coalesce(v_total_itens, 0),
        'produtos_count', coalesce(v_total_produtos, 0),
        'historicos_count', coalesce(v_total_historicos, 0),
        'supermercados_count', coalesce(v_total_supermercados, 0),
        'categorias_count', coalesce(v_total_categorias, 0)
    );
end;
$$;

revoke all on function public.obter_resumo_exportacao_familia() from public, anon;
grant execute on function public.obter_resumo_exportacao_familia() to authenticated;

-- ============================================================
-- 2. Backup completo da família
-- ============================================================

create or replace function public.obter_backup_exportacao_familia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_papel text;
    v_payload jsonb;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para exportar os dados.';
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
            message = 'A família atual do usuário não foi encontrada.';
    end if;

    if v_papel <> 'administrador' then
        raise exception using
            errcode = '42501',
            message = 'Somente administradores podem exportar todos os dados da família.';
    end if;

    select jsonb_build_object(
        'formato', 'gestao-compras-backup',
        'versao_schema', 12,
        'gerado_em', now(),
        'familia', jsonb_build_object(
            'id', f.id,
            'nome', f.nome,
            'plano', f.plano,
            'status', f.status,
            'licenca_status', f.licenca_status,
            'licenca_expira_em', f.licenca_expira_em,
            'criado_em', f.criado_em,
            'atualizado_em', f.atualizado_em
        ),
        'configuracoes', jsonb_build_object(
            'moeda', cf.moeda,
            'localidade', cf.localidade,
            'limite_usuarios', cf.limite_usuarios,
            'recursos_habilitados', cf.recursos_habilitados,
            'criado_em', cf.criado_em,
            'atualizado_em', cf.atualizado_em
        ),
        'membros', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'usuario_id', fm.usuario_id,
                    'nome', p.nome,
                    'email', p.email,
                    'papel', fm.papel,
                    'status', fm.status,
                    'criado_em', fm.criado_em,
                    'atualizado_em', fm.atualizado_em
                ) order by fm.papel asc, p.nome asc
            )
              from public.familia_membros fm
              join public.perfis p on p.id = fm.usuario_id
             where fm.familia_id = v_familia_id
        ), '[]'::jsonb),
        'categorias', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'nome', c.nome,
                    'sistema', c.sistema,
                    'ativo', c.ativo,
                    'criado_em', c.criado_em,
                    'atualizado_em', c.atualizado_em
                ) order by c.nome asc
            )
              from public.categorias c
             where c.familia_id = v_familia_id
        ), '[]'::jsonb),
        'supermercados', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'nome', s.nome,
                    'cnpj', coalesce(s.cnpj, ''),
                    'ativo', s.ativo,
                    'criado_em', s.criado_em,
                    'atualizado_em', s.atualizado_em
                ) order by s.nome asc
            )
              from public.supermercados s
             where s.familia_id = v_familia_id
        ), '[]'::jsonb),
        'produtos', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'categoria_id', p.categoria_id,
                    'categoria_nome', coalesce(c.nome, 'Não classificado'),
                    'nome', p.nome,
                    'marca', coalesce(p.marca, ''),
                    'unidade_padrao', p.unidade_padrao,
                    'revisar', p.revisar,
                    'ativo', p.ativo,
                    'criado_em', p.criado_em,
                    'atualizado_em', p.atualizado_em
                ) order by p.nome asc
            )
              from public.produtos p
              left join public.categorias c on c.id = p.categoria_id
             where p.familia_id = v_familia_id
        ), '[]'::jsonb),
        'compras', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'criado_por', c.criado_por,
                    'criado_por_email', coalesce(p.email, ''),
                    'supermercado_id', c.supermercado_id,
                    'supermercado_nome', coalesce(s.nome, 'Sem supermercado'),
                    'chave_nfce', coalesce(c.chave_nfce, ''),
                    'qr_texto', coalesce(c.qr_texto, ''),
                    'data_compra', c.data_compra,
                    'valor_total', c.valor_total,
                    'forma_pagamento', coalesce(c.forma_pagamento, ''),
                    'valor_pago', c.valor_pago,
                    'origem', c.origem,
                    'status', c.status,
                    'criado_em', c.criado_em,
                    'atualizado_em', c.atualizado_em
                ) order by c.data_compra desc, c.criado_em desc
            )
              from public.compras c
              left join public.supermercados s on s.id = c.supermercado_id
              left join public.perfis p on p.id = c.criado_por
             where c.familia_id = v_familia_id
        ), '[]'::jsonb),
        'itens_compra', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'compra_id', i.compra_id,
                    'data_compra', c.data_compra,
                    'supermercado_nome', coalesce(s.nome, 'Sem supermercado'),
                    'produto_id', i.produto_id,
                    'produto_nome', coalesce(p.nome, i.descricao_original),
                    'categoria_nome', coalesce(cat.nome, 'Não classificado'),
                    'descricao_original', i.descricao_original,
                    'quantidade', i.quantidade,
                    'unidade', i.unidade,
                    'valor_unitario', i.valor_unitario,
                    'valor_total', i.valor_total,
                    'criado_em', i.criado_em
                ) order by c.data_compra desc, i.valor_total desc, i.criado_em desc
            )
              from public.itens_compra i
              join public.compras c on c.id = i.compra_id
              left join public.supermercados s on s.id = c.supermercado_id
              left join public.produtos p on p.id = i.produto_id
              left join public.categorias cat on cat.id = p.categoria_id
             where i.familia_id = v_familia_id
        ), '[]'::jsonb),
        'historico_precos', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', h.id,
                    'produto_id', h.produto_id,
                    'produto_nome', p.nome,
                    'categoria_nome', coalesce(cat.nome, 'Não classificado'),
                    'compra_id', h.compra_id,
                    'supermercado_id', h.supermercado_id,
                    'supermercado_nome', coalesce(s.nome, 'Sem supermercado'),
                    'data_compra', h.data_compra,
                    'unidade', h.unidade,
                    'quantidade', h.quantidade,
                    'valor_unitario', h.valor_unitario,
                    'criado_em', h.criado_em
                ) order by h.data_compra desc, p.nome asc
            )
              from public.historico_precos h
              join public.produtos p on p.id = h.produto_id
              left join public.categorias cat on cat.id = p.categoria_id
              left join public.supermercados s on s.id = h.supermercado_id
             where h.familia_id = v_familia_id
        ), '[]'::jsonb)
    )
      into v_payload
      from public.familias f
      join public.configuracoes_familia cf on cf.familia_id = f.id
     where f.id = v_familia_id;

    if v_payload is null then
        raise exception using
            errcode = 'P0002',
            message = 'Não foi possível preparar o backup da família.';
    end if;

    return v_payload;
end;
$$;

revoke all on function public.obter_backup_exportacao_familia() from public, anon;
grant execute on function public.obter_backup_exportacao_familia() to authenticated;

commit;
