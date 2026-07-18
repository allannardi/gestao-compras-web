-- Gestão de Compras Web v0.6.4 — Categorias e supermercados
-- Execute depois de 010_premium_historico_filtro.sql.

begin;

-- ============================================================
-- 1. Consulta consolidada dos cadastros da família
-- ============================================================

create or replace function public.obter_cadastros_familia()
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
    v_categorias jsonb;
    v_supermercados jsonb;
    v_resumo jsonb;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar os cadastros.';
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

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'nome', c.nome,
                'sistema', c.sistema,
                'ativo', c.ativo,
                'produtos_count', (
                    select count(*)::integer
                      from public.produtos p
                     where p.familia_id = v_familia_id
                       and p.categoria_id = c.id
                       and p.ativo = true
                )
            ) order by
                c.ativo desc,
                case
                    when c.nome_normalizado = private.normalizar_texto('Não classificado') then 0
                    else 1
                end,
                c.nome asc
        ),
        '[]'::jsonb
    )
      into v_categorias
      from public.categorias c
     where c.familia_id = v_familia_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'nome', s.nome,
                'cnpj', coalesce(s.cnpj, ''),
                'ativo', s.ativo,
                'compras_count', (
                    select count(*)::integer
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
                ),
                'ultima_compra', (
                    select max(c.data_compra)
                      from public.compras c
                     where c.familia_id = v_familia_id
                       and c.supermercado_id = s.id
                       and c.status = 'confirmada'
                )
            ) order by
                s.ativo desc,
                (
                    select max(c.data_compra)
                      from public.compras c
                     where c.familia_id = v_familia_id
                       and c.supermercado_id = s.id
                       and c.status = 'confirmada'
                ) desc nulls last,
                s.nome asc
        ),
        '[]'::jsonb
    )
      into v_supermercados
      from public.supermercados s
     where s.familia_id = v_familia_id
       and s.ativo = true;

    select jsonb_build_object(
        'categorias_ativas', (
            select count(*)::integer
              from public.categorias c
             where c.familia_id = v_familia_id
               and c.ativo = true
        ),
        'categorias_personalizadas', (
            select count(*)::integer
              from public.categorias c
             where c.familia_id = v_familia_id
               and c.ativo = true
               and c.sistema = false
        ),
        'produtos_classificados', (
            select count(*)::integer
              from public.produtos p
              left join public.categorias c on c.id = p.categoria_id
             where p.familia_id = v_familia_id
               and p.ativo = true
               and p.revisar = false
               and c.ativo = true
        ),
        'supermercados_ativos', (
            select count(*)::integer
              from public.supermercados s
             where s.familia_id = v_familia_id
               and s.ativo = true
        ),
        'compras_com_supermercado', (
            select count(*)::integer
              from public.compras c
             where c.familia_id = v_familia_id
               and c.supermercado_id is not null
               and c.status = 'confirmada'
        )
    ) into v_resumo;

    return jsonb_build_object(
        'categorias', v_categorias,
        'supermercados', v_supermercados,
        'resumo', v_resumo,
        'pode_editar', v_papel = 'administrador'
    );
end;
$$;

-- ============================================================
-- 2. Categorias personalizadas
-- ============================================================

create or replace function public.atualizar_categoria_cadastro(
    p_categoria_id uuid,
    p_nome text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_categoria public.categorias%rowtype;
    v_nome text := left(trim(coalesce(p_nome, '')), 80);
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para atualizar a categoria.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem alterar categorias.';
    end if;

    select *
      into v_categoria
      from public.categorias c
     where c.id = p_categoria_id
       and c.familia_id = v_familia_id
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Categoria não encontrada nesta família.';
    end if;

    if v_categoria.sistema then
        raise exception using errcode = '42501', message = 'Categorias do sistema não podem ser renomeadas.';
    end if;

    if char_length(v_nome) < 2 then
        raise exception using errcode = '22023', message = 'Informe um nome de categoria válido.';
    end if;

    begin
        update public.categorias
           set nome = v_nome,
               nome_normalizado = private.normalizar_texto(v_nome),
               atualizado_em = now()
         where id = p_categoria_id
           and familia_id = v_familia_id;
    exception
        when unique_violation then
            raise exception using errcode = '23505', message = 'Já existe uma categoria com esse nome.';
    end;

    return jsonb_build_object(
        'id', p_categoria_id,
        'nome', v_nome,
        'sistema', false,
        'ativo', v_categoria.ativo,
        'produtos_movidos', 0,
        'mensagem', 'Categoria atualizada.'
    );
end;
$$;

create or replace function public.desativar_categoria_cadastro(
    p_categoria_id uuid,
    p_categoria_destino_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_categoria public.categorias%rowtype;
    v_destino public.categorias%rowtype;
    v_produtos_movidos integer := 0;
    v_destino_revisar boolean;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para desativar a categoria.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem desativar categorias.';
    end if;

    select * into v_categoria
      from public.categorias c
     where c.id = p_categoria_id
       and c.familia_id = v_familia_id
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Categoria não encontrada nesta família.';
    end if;

    if v_categoria.sistema then
        raise exception using errcode = '42501', message = 'Categorias do sistema não podem ser desativadas.';
    end if;

    if not v_categoria.ativo then
        raise exception using errcode = '22023', message = 'A categoria já está desativada.';
    end if;

    if p_categoria_id = p_categoria_destino_id then
        raise exception using errcode = '22023', message = 'Selecione outra categoria para receber os produtos.';
    end if;

    select * into v_destino
      from public.categorias c
     where c.id = p_categoria_destino_id
       and c.familia_id = v_familia_id
       and c.ativo = true
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'A categoria de destino não foi encontrada.';
    end if;

    v_destino_revisar := v_destino.nome_normalizado = private.normalizar_texto('Não classificado');

    update public.produtos
       set categoria_id = v_destino.id,
           revisar = v_destino_revisar,
           atualizado_em = now()
     where familia_id = v_familia_id
       and categoria_id = v_categoria.id
       and ativo = true;

    get diagnostics v_produtos_movidos = row_count;

    update public.categorias
       set ativo = false,
           atualizado_em = now()
     where id = v_categoria.id
       and familia_id = v_familia_id;

    return jsonb_build_object(
        'id', v_categoria.id,
        'nome', v_categoria.nome,
        'sistema', false,
        'ativo', false,
        'produtos_movidos', v_produtos_movidos,
        'mensagem', format(
            'Categoria desativada. %s produto(s) foram movidos para %s.',
            v_produtos_movidos,
            v_destino.nome
        )
    );
end;
$$;

create or replace function public.reativar_categoria_cadastro(p_categoria_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_categoria public.categorias%rowtype;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para reativar a categoria.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem reativar categorias.';
    end if;

    select * into v_categoria
      from public.categorias c
     where c.id = p_categoria_id
       and c.familia_id = v_familia_id
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Categoria não encontrada nesta família.';
    end if;

    update public.categorias
       set ativo = true,
           atualizado_em = now()
     where id = p_categoria_id
       and familia_id = v_familia_id;

    return jsonb_build_object(
        'id', v_categoria.id,
        'nome', v_categoria.nome,
        'sistema', v_categoria.sistema,
        'ativo', true,
        'produtos_movidos', 0,
        'mensagem', 'Categoria reativada.'
    );
end;
$$;

-- ============================================================
-- 3. Supermercados
-- ============================================================

create or replace function public.atualizar_supermercado_cadastro(
    p_supermercado_id uuid,
    p_nome text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_supermercado public.supermercados%rowtype;
    v_nome text := left(trim(coalesce(p_nome, '')), 160);
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para atualizar o supermercado.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem alterar supermercados.';
    end if;

    select * into v_supermercado
      from public.supermercados s
     where s.id = p_supermercado_id
       and s.familia_id = v_familia_id
       and s.ativo = true
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Supermercado não encontrado nesta família.';
    end if;

    if char_length(v_nome) < 2 then
        raise exception using errcode = '22023', message = 'Informe um nome de supermercado válido.';
    end if;

    begin
        update public.supermercados
           set nome = v_nome,
               nome_normalizado = private.normalizar_texto(v_nome),
               atualizado_em = now()
         where id = p_supermercado_id
           and familia_id = v_familia_id;
    exception
        when unique_violation then
            raise exception using errcode = '23505', message = 'Já existe um supermercado com esse nome.';
    end;

    return jsonb_build_object(
        'id', v_supermercado.id,
        'nome', v_nome,
        'cnpj', coalesce(v_supermercado.cnpj, ''),
        'compras_movidas', 0,
        'historicos_movidos', 0,
        'mensagem', 'Nome do supermercado atualizado.'
    );
end;
$$;

create or replace function public.mesclar_supermercados_cadastro(
    p_supermercado_origem_id uuid,
    p_supermercado_destino_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_origem public.supermercados%rowtype;
    v_destino public.supermercados%rowtype;
    v_compras_movidas integer := 0;
    v_historicos_movidos integer := 0;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para unir supermercados.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem unir supermercados.';
    end if;

    if p_supermercado_origem_id = p_supermercado_destino_id then
        raise exception using errcode = '22023', message = 'Selecione outro supermercado como destino.';
    end if;

    select * into v_origem
      from public.supermercados s
     where s.id = p_supermercado_origem_id
       and s.familia_id = v_familia_id
       and s.ativo = true
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Supermercado de origem não encontrado.';
    end if;

    select * into v_destino
      from public.supermercados s
     where s.id = p_supermercado_destino_id
       and s.familia_id = v_familia_id
       and s.ativo = true
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Supermercado de destino não encontrado.';
    end if;

    -- O registro automático da NFC-e identifica o mercado pelo CNPJ. Para evitar
    -- que o cadastro duplicado reapareça, a união só é segura quando a origem
    -- possui CNPJ e o destino está sem CNPJ ou possui o mesmo CNPJ.
    if v_origem.cnpj is null then
        raise exception using
            errcode = '22023',
            message = 'Este supermercado não possui CNPJ. Corrija o nome em vez de unir os cadastros.';
    end if;

    if v_destino.cnpj is not null and v_destino.cnpj <> v_origem.cnpj then
        raise exception using
            errcode = '22023',
            message = 'Supermercados com CNPJs diferentes não podem ser unidos com segurança.';
    end if;

    update public.compras
       set supermercado_id = v_destino.id,
           atualizado_em = now()
     where familia_id = v_familia_id
       and supermercado_id = v_origem.id;
    get diagnostics v_compras_movidas = row_count;

    update public.historico_precos
       set supermercado_id = v_destino.id
     where familia_id = v_familia_id
       and supermercado_id = v_origem.id;
    get diagnostics v_historicos_movidos = row_count;

    -- Libera o CNPJ da origem antes de transferi-lo para o destino.
    update public.supermercados
       set cnpj = null,
           ativo = false,
           atualizado_em = now()
     where id = v_origem.id
       and familia_id = v_familia_id;

    if v_destino.cnpj is null then
        update public.supermercados
           set cnpj = v_origem.cnpj,
               atualizado_em = now()
         where id = v_destino.id
           and familia_id = v_familia_id;
    end if;

    return jsonb_build_object(
        'id', v_destino.id,
        'nome', v_destino.nome,
        'cnpj', coalesce(v_destino.cnpj, v_origem.cnpj, ''),
        'compras_movidas', v_compras_movidas,
        'historicos_movidos', v_historicos_movidos,
        'mensagem', format(
            'Cadastros unidos. %s compra(s) e %s registro(s) de preço foram movidos para %s.',
            v_compras_movidas,
            v_historicos_movidos,
            v_destino.nome
        )
    );
end;
$$;

revoke all on function public.obter_cadastros_familia() from public, anon;
revoke all on function public.atualizar_categoria_cadastro(uuid, text) from public, anon;
revoke all on function public.desativar_categoria_cadastro(uuid, uuid) from public, anon;
revoke all on function public.reativar_categoria_cadastro(uuid) from public, anon;
revoke all on function public.atualizar_supermercado_cadastro(uuid, text) from public, anon;
revoke all on function public.mesclar_supermercados_cadastro(uuid, uuid) from public, anon;

grant execute on function public.obter_cadastros_familia() to authenticated;
grant execute on function public.atualizar_categoria_cadastro(uuid, text) to authenticated;
grant execute on function public.desativar_categoria_cadastro(uuid, uuid) to authenticated;
grant execute on function public.reativar_categoria_cadastro(uuid) to authenticated;
grant execute on function public.atualizar_supermercado_cadastro(uuid, text) to authenticated;
grant execute on function public.mesclar_supermercados_cadastro(uuid, uuid) to authenticated;

commit;
