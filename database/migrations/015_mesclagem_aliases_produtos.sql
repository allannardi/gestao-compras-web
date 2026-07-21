-- Gestão de Compras Web v1.1.0 — Mesclagem e aliases de produtos
-- Execute depois de 014_beta_controlado.sql.
-- Esta migration preserva compras e históricos existentes.

begin;

-- ============================================================
-- 1. Estrutura de aliases e auditoria
-- ============================================================

alter table public.produtos
    add column if not exists mesclado_em_produto_id uuid references public.produtos(id) on delete set null,
    add column if not exists mesclado_por uuid references auth.users(id) on delete set null,
    add column if not exists mesclado_em timestamptz;

create table if not exists public.produto_aliases (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    produto_id uuid not null references public.produtos(id) on delete cascade,
    descricao text not null,
    descricao_normalizada text not null,
    unidade text not null,
    origem text not null default 'historico'
        check (origem in ('produto', 'historico', 'mesclagem', 'compra', 'manual')),
    criado_por uuid references auth.users(id) on delete set null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint produto_aliases_descricao_tamanho
        check (char_length(trim(descricao)) between 1 and 240),
    constraint produto_aliases_unidade_tamanho
        check (char_length(trim(unidade)) between 1 and 20)
);

create unique index if not exists produto_aliases_familia_descricao_unidade_unique
    on public.produto_aliases(familia_id, descricao_normalizada, unidade);

create index if not exists produto_aliases_produto_idx
    on public.produto_aliases(familia_id, produto_id);

create table if not exists public.produto_mesclagens (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    produto_principal_id uuid not null references public.produtos(id) on delete cascade,
    produto_incorporado_id uuid not null references public.produtos(id) on delete cascade,
    realizado_por uuid references auth.users(id) on delete set null,
    produto_principal_snapshot jsonb not null,
    produto_incorporado_snapshot jsonb not null,
    itens_transferidos integer not null default 0 check (itens_transferidos >= 0),
    historicos_transferidos integer not null default 0 check (historicos_transferidos >= 0),
    aliases_ativos integer not null default 0 check (aliases_ativos >= 0),
    criado_em timestamptz not null default now(),
    constraint produto_mesclagens_produtos_diferentes
        check (produto_principal_id <> produto_incorporado_id)
);

create index if not exists produto_mesclagens_familia_data_idx
    on public.produto_mesclagens(familia_id, criado_em desc);

alter table public.produto_aliases enable row level security;
alter table public.produto_mesclagens enable row level security;

drop policy if exists produto_aliases_select_familia on public.produto_aliases;
create policy produto_aliases_select_familia
on public.produto_aliases for select
using (private.usuario_pertence_familia(familia_id));

drop policy if exists produto_mesclagens_select_admin on public.produto_mesclagens;
create policy produto_mesclagens_select_admin
on public.produto_mesclagens for select
using (private.usuario_admin_familia(familia_id));

revoke all on public.produto_aliases from anon, authenticated;
revoke all on public.produto_mesclagens from anon, authenticated;
grant select on public.produto_aliases to authenticated;
grant select on public.produto_mesclagens to authenticated;

-- ============================================================
-- 2. Aliases iniciais para preservar descrições já conhecidas
-- ============================================================

insert into public.produto_aliases (
    familia_id,
    produto_id,
    descricao,
    descricao_normalizada,
    unidade,
    origem
)
select
    p.familia_id,
    p.id,
    p.nome,
    p.nome_normalizado,
    lower(p.unidade_padrao),
    'produto'
from public.produtos p
where p.ativo = true
on conflict (familia_id, descricao_normalizada, unidade)
do update
   set descricao = excluded.descricao,
       atualizado_em = now()
where produto_aliases.produto_id = excluded.produto_id;

with variantes_unicas as (
    select
        i.familia_id,
        private.normalizar_texto(i.descricao_original) as descricao_normalizada,
        lower(i.unidade) as unidade,
        min(i.descricao_original) as descricao,
        (array_agg(distinct i.produto_id))[1] as produto_id
    from public.itens_compra i
    join public.produtos p
      on p.id = i.produto_id
     and p.familia_id = i.familia_id
     and p.ativo = true
    where i.produto_id is not null
      and nullif(trim(i.descricao_original), '') is not null
    group by
        i.familia_id,
        private.normalizar_texto(i.descricao_original),
        lower(i.unidade)
    having count(distinct i.produto_id) = 1
)
insert into public.produto_aliases (
    familia_id,
    produto_id,
    descricao,
    descricao_normalizada,
    unidade,
    origem
)
select
    v.familia_id,
    v.produto_id,
    left(v.descricao, 240),
    v.descricao_normalizada,
    left(v.unidade, 20),
    'historico'
from variantes_unicas v
where v.produto_id is not null
on conflict (familia_id, descricao_normalizada, unidade)
do nothing;

-- ============================================================
-- 3. Candidatos de mesclagem
-- ============================================================

create or replace function public.listar_candidatos_mesclagem_produto(
    p_produto_principal_id uuid,
    p_busca text default null,
    p_limite integer default 50
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
    v_papel text;
    v_unidade text;
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 100);
    v_principal jsonb;
    v_candidatos jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para mesclar produtos.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    if v_papel <> 'administrador' then
        raise exception using errcode = '42501', message = 'Apenas administradores podem mesclar produtos.';
    end if;

    select p.unidade_padrao
      into v_unidade
      from public.produtos p
     where p.id = p_produto_principal_id
       and p.familia_id = v_familia_id
       and p.ativo = true;

    if v_unidade is null then
        raise exception using errcode = 'P0002', message = 'Produto principal não encontrado nesta família.';
    end if;

    select jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'marca', coalesce(p.marca, ''),
        'unidade_padrao', p.unidade_padrao,
        'categoria_nome', coalesce(c.nome, 'Não classificado'),
        'compras_count', (
            select count(distinct i.compra_id)::integer
              from public.itens_compra i
             where i.familia_id = v_familia_id
               and i.produto_id = p.id
        ),
        'registros_precos_count', (
            select count(*)::integer
              from public.historico_precos h
             where h.familia_id = v_familia_id
               and h.produto_id = p.id
        ),
        'quantidade_total', coalesce((
            select sum(i.quantidade)
              from public.itens_compra i
             where i.familia_id = v_familia_id
               and i.produto_id = p.id
        ), 0),
        'ultima_compra', (
            select max(cmp.data_compra)
              from public.itens_compra i
              join public.compras cmp on cmp.id = i.compra_id
             where i.familia_id = v_familia_id
               and i.produto_id = p.id
        ),
        'aliases_count', (
            select count(*)::integer
              from public.produto_aliases a
             where a.familia_id = v_familia_id
               and a.produto_id = p.id
        )
    )
      into v_principal
      from public.produtos p
      left join public.categorias c
        on c.id = p.categoria_id
       and c.familia_id = v_familia_id
     where p.id = p_produto_principal_id
       and p.familia_id = v_familia_id
       and p.ativo = true;

    select coalesce(jsonb_agg(to_jsonb(candidato)
        order by candidato.compras_count desc,
                 candidato.registros_precos_count desc,
                 candidato.nome asc), '[]'::jsonb)
      into v_candidatos
      from (
        select
            p.id,
            p.nome,
            coalesce(p.marca, '')::text as marca,
            p.unidade_padrao,
            coalesce(c.nome, 'Não classificado')::text as categoria_nome,
            (
                select count(distinct i.compra_id)
                  from public.itens_compra i
                 where i.familia_id = v_familia_id
                   and i.produto_id = p.id
            )::integer as compras_count,
            (
                select count(*)
                  from public.historico_precos h
                 where h.familia_id = v_familia_id
                   and h.produto_id = p.id
            )::integer as registros_precos_count,
            coalesce((
                select sum(i.quantidade)
                  from public.itens_compra i
                 where i.familia_id = v_familia_id
                   and i.produto_id = p.id
            ), 0) as quantidade_total,
            (
                select max(cmp.data_compra)
                  from public.itens_compra i
                  join public.compras cmp on cmp.id = i.compra_id
                 where i.familia_id = v_familia_id
                   and i.produto_id = p.id
            ) as ultima_compra,
            (
                select count(*)
                  from public.produto_aliases a
                 where a.familia_id = v_familia_id
                   and a.produto_id = p.id
            )::integer as aliases_count
          from public.produtos p
          left join public.categorias c
            on c.id = p.categoria_id
           and c.familia_id = v_familia_id
         where p.familia_id = v_familia_id
           and p.ativo = true
           and p.id <> p_produto_principal_id
           and lower(p.unidade_padrao) = lower(v_unidade)
           and (
                v_busca is null
                or private.texto_classificacao(p.nome || ' ' || coalesce(p.marca, ''))
                   like '%' || private.texto_classificacao(v_busca) || '%'
           )
         order by compras_count desc, registros_precos_count desc, p.nome asc
         limit v_limite
      ) candidato;

    return jsonb_build_object(
        'produto_principal', v_principal,
        'candidatos', v_candidatos,
        'limite', v_limite,
        'busca', coalesce(v_busca, '')
    );
end;
$$;

-- ============================================================
-- 4. Mesclagem transacional
-- ============================================================

create or replace function public.mesclar_produtos_familia(
    p_produto_principal_id uuid,
    p_produto_incorporado_id uuid
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
    v_principal record;
    v_incorporado record;
    v_historico record;
    v_historico_destino_id uuid;
    v_itens_transferidos integer := 0;
    v_historicos_transferidos integer := 0;
    v_aliases_ativos integer := 0;
    v_mesclagem_id uuid;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para mesclar produtos.';
    end if;

    if p_produto_principal_id = p_produto_incorporado_id then
        raise exception using errcode = '22023', message = 'Selecione dois produtos diferentes para a mesclagem.';
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
        raise exception using errcode = 'P0001', message = 'A família do usuário não foi encontrada.';
    end if;

    if v_papel <> 'administrador' then
        raise exception using errcode = '42501', message = 'Apenas administradores podem mesclar produtos.';
    end if;

    select p.*
      into v_principal
      from public.produtos p
     where p.id = p_produto_principal_id
       and p.familia_id = v_familia_id
       and p.ativo = true
     for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Produto principal não encontrado nesta família.';
    end if;

    select p.*
      into v_incorporado
      from public.produtos p
     where p.id = p_produto_incorporado_id
       and p.familia_id = v_familia_id
       and p.ativo = true
     for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Produto que será incorporado não foi encontrado nesta família.';
    end if;

    if lower(v_principal.unidade_padrao) <> lower(v_incorporado.unidade_padrao) then
        raise exception using
            errcode = '22023',
            message = 'Nesta versão, somente produtos com a mesma unidade podem ser mesclados.';
    end if;

    select count(*)::integer
      into v_itens_transferidos
      from public.itens_compra i
     where i.familia_id = v_familia_id
       and i.produto_id = p_produto_incorporado_id;

    select count(*)::integer
      into v_historicos_transferidos
      from public.historico_precos h
     where h.familia_id = v_familia_id
       and h.produto_id = p_produto_incorporado_id;

    -- Registra todas as descrições já usadas pelos dois produtos como aliases
    -- do produto principal. Um alias de um terceiro produto não é alterado.
    insert into public.produto_aliases (
        familia_id,
        produto_id,
        descricao,
        descricao_normalizada,
        unidade,
        origem,
        criado_por
    )
    select distinct on (
        private.normalizar_texto(i.descricao_original),
        lower(i.unidade)
    )
        v_familia_id,
        p_produto_principal_id,
        left(i.descricao_original, 240),
        private.normalizar_texto(i.descricao_original),
        lower(left(i.unidade, 20)),
        'mesclagem',
        v_usuario_id
    from public.itens_compra i
    where i.familia_id = v_familia_id
      and i.produto_id in (p_produto_principal_id, p_produto_incorporado_id)
      and nullif(trim(i.descricao_original), '') is not null
    order by
        private.normalizar_texto(i.descricao_original),
        lower(i.unidade),
        i.criado_em
    on conflict (familia_id, descricao_normalizada, unidade)
    do update
       set produto_id = excluded.produto_id,
           descricao = excluded.descricao,
           origem = 'mesclagem',
           criado_por = excluded.criado_por,
           atualizado_em = now()
    where produto_aliases.produto_id in (
        p_produto_principal_id,
        p_produto_incorporado_id
    );

    insert into public.produto_aliases (
        familia_id,
        produto_id,
        descricao,
        descricao_normalizada,
        unidade,
        origem,
        criado_por
    )
    values
        (
            v_familia_id,
            p_produto_principal_id,
            v_principal.nome,
            v_principal.nome_normalizado,
            lower(v_principal.unidade_padrao),
            'mesclagem',
            v_usuario_id
        ),
        (
            v_familia_id,
            p_produto_principal_id,
            v_incorporado.nome,
            v_incorporado.nome_normalizado,
            lower(v_incorporado.unidade_padrao),
            'mesclagem',
            v_usuario_id
        )
    on conflict (familia_id, descricao_normalizada, unidade)
    do update
       set produto_id = excluded.produto_id,
           descricao = excluded.descricao,
           origem = 'mesclagem',
           criado_por = excluded.criado_por,
           atualizado_em = now()
    where produto_aliases.produto_id in (
        p_produto_principal_id,
        p_produto_incorporado_id
    );

    update public.produto_aliases
       set produto_id = p_produto_principal_id,
           origem = 'mesclagem',
           criado_por = v_usuario_id,
           atualizado_em = now()
     where familia_id = v_familia_id
       and produto_id = p_produto_incorporado_id;

    -- Reúne históricos. Quando a mesma compra já possui o mesmo preço no
    -- produto principal, as quantidades são somadas e o registro duplicado é removido.
    for v_historico in
        select h.id, h.compra_id, h.valor_unitario, h.quantidade
          from public.historico_precos h
         where h.familia_id = v_familia_id
           and h.produto_id = p_produto_incorporado_id
         order by h.criado_em
         for update
    loop
        v_historico_destino_id := null;

        update public.historico_precos h
           set quantidade = h.quantidade + v_historico.quantidade
         where h.familia_id = v_familia_id
           and h.produto_id = p_produto_principal_id
           and h.compra_id = v_historico.compra_id
           and h.valor_unitario = v_historico.valor_unitario
        returning h.id into v_historico_destino_id;

        if v_historico_destino_id is not null then
            delete from public.historico_precos
             where id = v_historico.id
               and familia_id = v_familia_id;
        else
            update public.historico_precos
               set produto_id = p_produto_principal_id
             where id = v_historico.id
               and familia_id = v_familia_id;
        end if;
    end loop;

    update public.itens_compra
       set produto_id = p_produto_principal_id
     where familia_id = v_familia_id
       and produto_id = p_produto_incorporado_id;

    update public.produtos
       set ativo = false,
           revisar = false,
           nome_normalizado = nome_normalizado
               || '__mesclado__'
               || replace(id::text, '-', ''),
           mesclado_em_produto_id = p_produto_principal_id,
           mesclado_por = v_usuario_id,
           mesclado_em = now(),
           atualizado_em = now()
     where id = p_produto_incorporado_id
       and familia_id = v_familia_id;

    update public.produtos
       set atualizado_em = now()
     where id = p_produto_principal_id
       and familia_id = v_familia_id;

    select count(*)::integer
      into v_aliases_ativos
      from public.produto_aliases a
     where a.familia_id = v_familia_id
       and a.produto_id = p_produto_principal_id;

    insert into public.produto_mesclagens (
        familia_id,
        produto_principal_id,
        produto_incorporado_id,
        realizado_por,
        produto_principal_snapshot,
        produto_incorporado_snapshot,
        itens_transferidos,
        historicos_transferidos,
        aliases_ativos
    ) values (
        v_familia_id,
        p_produto_principal_id,
        p_produto_incorporado_id,
        v_usuario_id,
        jsonb_build_object(
            'id', v_principal.id,
            'nome', v_principal.nome,
            'marca', coalesce(v_principal.marca, ''),
            'unidade_padrao', v_principal.unidade_padrao,
            'categoria_id', v_principal.categoria_id
        ),
        jsonb_build_object(
            'id', v_incorporado.id,
            'nome', v_incorporado.nome,
            'marca', coalesce(v_incorporado.marca, ''),
            'unidade_padrao', v_incorporado.unidade_padrao,
            'categoria_id', v_incorporado.categoria_id
        ),
        v_itens_transferidos,
        v_historicos_transferidos,
        v_aliases_ativos
    )
    returning id into v_mesclagem_id;

    return jsonb_build_object(
        'mesclagem_id', v_mesclagem_id,
        'produto_principal_id', p_produto_principal_id,
        'produto_incorporado_id', p_produto_incorporado_id,
        'produto_principal_nome', v_principal.nome,
        'produto_incorporado_nome', v_incorporado.nome,
        'itens_transferidos', v_itens_transferidos,
        'historicos_transferidos', v_historicos_transferidos,
        'aliases_ativos', v_aliases_ativos,
        'mensagem', 'Produtos mesclados com sucesso. O histórico e as descrições anteriores foram preservados.'
    );
end;
$$;

-- ============================================================
-- 5. Registro de compras reconhecendo aliases
-- ============================================================

create or replace function public.registrar_compra_nfce(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_categoria_id uuid;
    v_supermercado_id uuid;
    v_compra_id uuid;
    v_produto_id uuid;
    v_item jsonb;
    v_mercado_nome text;
    v_mercado_normalizado text;
    v_cnpj text;
    v_chave_nfce text;
    v_data_compra date;
    v_descricao text;
    v_descricao_normalizada text;
    v_unidade text;
    v_quantidade numeric(14, 3);
    v_valor_unitario numeric(14, 4);
    v_valor_item numeric(14, 2);
    v_valor_total numeric(14, 2);
    v_valor_pago numeric(14, 2);
    v_itens_salvos integer := 0;
    v_produtos_criados integer := 0;
    v_produtos_reutilizados integer := 0;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para registrar a compra.';
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

    if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
        raise exception using
            errcode = '22023',
            message = 'Os dados da compra são inválidos.';
    end if;

    if jsonb_typeof(p_payload -> 'itens') <> 'array'
       or jsonb_array_length(p_payload -> 'itens') = 0 then
        raise exception using
            errcode = '22023',
            message = 'A compra precisa ter pelo menos um item.';
    end if;

    v_chave_nfce := private.somente_digitos(p_payload ->> 'chave_nfce');
    if v_chave_nfce is not null and char_length(v_chave_nfce) <> 44 then
        v_chave_nfce := null;
    end if;

    if v_chave_nfce is not null and exists (
        select 1
          from public.compras c
         where c.familia_id = v_familia_id
           and c.chave_nfce = v_chave_nfce
    ) then
        raise exception using
            errcode = '23505',
            message = 'Esta NFC-e já foi registrada nesta família.';
    end if;

    begin
        v_data_compra := nullif(p_payload ->> 'data_compra', '')::date;
    exception when others then
        raise exception using
            errcode = '22007',
            message = 'A data da compra é inválida.';
    end;

    if v_data_compra is null then
        raise exception using
            errcode = '22007',
            message = 'A data da compra não foi informada.';
    end if;

    v_valor_total := round(coalesce((p_payload ->> 'valor_total')::numeric, 0), 2);
    v_valor_pago := round(coalesce((p_payload ->> 'valor_pago')::numeric, 0), 2);

    if v_valor_total <= 0 then
        raise exception using
            errcode = '22023',
            message = 'O valor total da compra precisa ser maior que zero.';
    end if;

    v_mercado_nome := left(
        coalesce(nullif(trim(p_payload ->> 'mercado_nome'), ''), 'Mercado não identificado'),
        160
    );
    v_mercado_normalizado := private.normalizar_texto(v_mercado_nome);
    v_cnpj := private.somente_digitos(p_payload ->> 'cnpj');

    if v_cnpj is not null then
        select s.id
          into v_supermercado_id
          from public.supermercados s
         where s.familia_id = v_familia_id
           and s.cnpj = v_cnpj
         limit 1;
    else
        select s.id
          into v_supermercado_id
          from public.supermercados s
         where s.familia_id = v_familia_id
           and s.cnpj is null
           and s.nome_normalizado = v_mercado_normalizado
         limit 1;
    end if;

    if v_supermercado_id is null then
        insert into public.supermercados (
            familia_id,
            nome,
            nome_normalizado,
            cnpj
        ) values (
            v_familia_id,
            v_mercado_nome,
            v_mercado_normalizado,
            v_cnpj
        )
        returning id into v_supermercado_id;
    else
        update public.supermercados
           set nome = v_mercado_nome,
               nome_normalizado = v_mercado_normalizado,
               atualizado_em = now()
         where id = v_supermercado_id;
    end if;

    insert into public.categorias (
        familia_id,
        nome,
        nome_normalizado,
        sistema
    ) values (
        v_familia_id,
        'Não classificado',
        private.normalizar_texto('Não classificado'),
        true
    )
    on conflict (familia_id, nome_normalizado)
    do update set atualizado_em = now()
    returning id into v_categoria_id;

    insert into public.compras (
        familia_id,
        criado_por,
        supermercado_id,
        chave_nfce,
        qr_texto,
        data_compra,
        valor_total,
        forma_pagamento,
        valor_pago,
        origem
    ) values (
        v_familia_id,
        v_usuario_id,
        v_supermercado_id,
        v_chave_nfce,
        nullif(p_payload ->> 'qr_texto', ''),
        v_data_compra,
        v_valor_total,
        nullif(left(trim(coalesce(p_payload ->> 'forma_pagamento', '')), 100), ''),
        greatest(v_valor_pago, 0),
        'nfce_qrcode'
    )
    returning id into v_compra_id;

    for v_item in
        select value from jsonb_array_elements(p_payload -> 'itens')
    loop
        v_descricao := left(trim(coalesce(v_item ->> 'descricao_original', '')), 240);
        if v_descricao = '' then
            raise exception using
                errcode = '22023',
                message = 'Há um item sem descrição na compra.';
        end if;

        v_descricao_normalizada := private.normalizar_texto(v_descricao);
        v_unidade := lower(left(coalesce(nullif(trim(v_item ->> 'unidade'), ''), 'un'), 20));
        v_quantidade := round(coalesce((v_item ->> 'quantidade')::numeric, 0), 3);
        v_valor_unitario := round(coalesce((v_item ->> 'valor_unitario')::numeric, 0), 4);
        v_valor_item := round(coalesce((v_item ->> 'valor_total')::numeric, 0), 2);

        if v_quantidade <= 0 or v_valor_unitario < 0 or v_valor_item < 0 then
            raise exception using
                errcode = '22023',
                message = 'Há um item com quantidade ou valor inválido.';
        end if;

        v_produto_id := null;

        select a.produto_id
          into v_produto_id
          from public.produto_aliases a
          join public.produtos p
            on p.id = a.produto_id
           and p.familia_id = a.familia_id
           and p.ativo = true
         where a.familia_id = v_familia_id
           and a.descricao_normalizada = v_descricao_normalizada
           and a.unidade = v_unidade
         limit 1;

        if v_produto_id is null then
            select p.id
              into v_produto_id
              from public.produtos p
             where p.familia_id = v_familia_id
               and p.nome_normalizado = v_descricao_normalizada
               and p.unidade_padrao = v_unidade
               and p.ativo = true
             limit 1;
        end if;

        if v_produto_id is null then
            insert into public.produtos (
                familia_id,
                categoria_id,
                nome,
                nome_normalizado,
                unidade_padrao,
                revisar
            ) values (
                v_familia_id,
                v_categoria_id,
                v_descricao,
                v_descricao_normalizada,
                v_unidade,
                true
            )
            returning id into v_produto_id;

            v_produtos_criados := v_produtos_criados + 1;
        else
            v_produtos_reutilizados := v_produtos_reutilizados + 1;
        end if;

        insert into public.produto_aliases (
            familia_id,
            produto_id,
            descricao,
            descricao_normalizada,
            unidade,
            origem,
            criado_por
        ) values (
            v_familia_id,
            v_produto_id,
            v_descricao,
            v_descricao_normalizada,
            v_unidade,
            'compra',
            v_usuario_id
        )
        on conflict (familia_id, descricao_normalizada, unidade)
        do update
           set descricao = excluded.descricao,
               atualizado_em = now()
        where produto_aliases.produto_id = excluded.produto_id;

        insert into public.itens_compra (
            familia_id,
            compra_id,
            produto_id,
            descricao_original,
            quantidade,
            unidade,
            valor_unitario,
            valor_total
        ) values (
            v_familia_id,
            v_compra_id,
            v_produto_id,
            v_descricao,
            v_quantidade,
            v_unidade,
            v_valor_unitario,
            v_valor_item
        );

        insert into public.historico_precos (
            familia_id,
            produto_id,
            compra_id,
            supermercado_id,
            data_compra,
            unidade,
            quantidade,
            valor_unitario
        ) values (
            v_familia_id,
            v_produto_id,
            v_compra_id,
            v_supermercado_id,
            v_data_compra,
            v_unidade,
            v_quantidade,
            v_valor_unitario
        );

        v_itens_salvos := v_itens_salvos + 1;
    end loop;

    return jsonb_build_object(
        'compra_id', v_compra_id,
        'familia_id', v_familia_id,
        'supermercado_id', v_supermercado_id,
        'itens_salvos', v_itens_salvos,
        'produtos_criados', v_produtos_criados,
        'produtos_reutilizados', v_produtos_reutilizados,
        'mensagem', 'Compra registrada com sucesso.'
    );
exception
    when unique_violation then
        raise exception using
            errcode = '23505',
            message = 'Esta NFC-e já foi registrada nesta família.';
end;
$$;

revoke all on function public.listar_candidatos_mesclagem_produto(uuid, text, integer) from public, anon;
revoke all on function public.mesclar_produtos_familia(uuid, uuid) from public, anon;
revoke all on function public.registrar_compra_nfce(jsonb) from public, anon;

grant execute on function public.listar_candidatos_mesclagem_produto(uuid, text, integer) to authenticated;
grant execute on function public.mesclar_produtos_familia(uuid, uuid) to authenticated;
grant execute on function public.registrar_compra_nfce(jsonb) to authenticated;

commit;
