begin;

-- ============================================================
-- v0.3.1 — Primeira gravação real de compras por família
-- Execute depois de 001_fundacao_familias.sql.
-- ============================================================

create or replace function private.normalizar_texto(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
    select lower(
        regexp_replace(
            trim(coalesce(p_texto, '')),
            '\s+',
            ' ',
            'g'
        )
    );
$$;

create or replace function private.somente_digitos(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
    select nullif(regexp_replace(coalesce(p_texto, ''), '\D', '', 'g'), '');
$$;

revoke all on function private.normalizar_texto(text) from public;
revoke all on function private.somente_digitos(text) from public;
grant execute on function private.normalizar_texto(text) to authenticated;
grant execute on function private.somente_digitos(text) to authenticated;

create table if not exists public.categorias (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    nome text not null,
    nome_normalizado text not null,
    sistema boolean not null default false,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint categorias_nome_tamanho check (char_length(trim(nome)) between 2 and 80),
    constraint categorias_familia_nome_unique unique (familia_id, nome_normalizado)
);

create table if not exists public.supermercados (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    nome text not null,
    nome_normalizado text not null,
    cnpj text,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint supermercados_nome_tamanho check (char_length(trim(nome)) between 2 and 160)
);

create unique index if not exists supermercados_familia_cnpj_unique
    on public.supermercados(familia_id, cnpj)
    where cnpj is not null;

create unique index if not exists supermercados_familia_nome_unique
    on public.supermercados(familia_id, nome_normalizado)
    where cnpj is null;

create table if not exists public.produtos (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    categoria_id uuid references public.categorias(id) on delete set null,
    nome text not null,
    nome_normalizado text not null,
    marca text,
    unidade_padrao text not null default 'un',
    revisar boolean not null default true,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint produtos_nome_tamanho check (char_length(trim(nome)) between 1 and 240),
    constraint produtos_familia_nome_unidade_unique
        unique (familia_id, nome_normalizado, unidade_padrao)
);

create table if not exists public.compras (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    criado_por uuid not null references auth.users(id) on delete restrict,
    supermercado_id uuid references public.supermercados(id) on delete set null,
    chave_nfce text,
    qr_texto text,
    data_compra date not null,
    valor_total numeric(14, 2) not null check (valor_total >= 0),
    forma_pagamento text,
    valor_pago numeric(14, 2) not null default 0 check (valor_pago >= 0),
    origem text not null default 'nfce_qrcode',
    status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create unique index if not exists compras_familia_chave_nfce_unique
    on public.compras(familia_id, chave_nfce)
    where chave_nfce is not null;

create index if not exists compras_familia_data_idx
    on public.compras(familia_id, data_compra desc, criado_em desc);

create table if not exists public.itens_compra (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    compra_id uuid not null references public.compras(id) on delete cascade,
    produto_id uuid references public.produtos(id) on delete set null,
    descricao_original text not null,
    quantidade numeric(14, 3) not null check (quantidade > 0),
    unidade text not null default 'un',
    valor_unitario numeric(14, 4) not null check (valor_unitario >= 0),
    valor_total numeric(14, 2) not null check (valor_total >= 0),
    criado_em timestamptz not null default now()
);

create index if not exists itens_compra_compra_idx
    on public.itens_compra(compra_id);
create index if not exists itens_compra_produto_idx
    on public.itens_compra(familia_id, produto_id);

create table if not exists public.historico_precos (
    id uuid primary key default gen_random_uuid(),
    familia_id uuid not null references public.familias(id) on delete cascade,
    produto_id uuid not null references public.produtos(id) on delete cascade,
    compra_id uuid not null references public.compras(id) on delete cascade,
    supermercado_id uuid references public.supermercados(id) on delete set null,
    data_compra date not null,
    unidade text not null default 'un',
    quantidade numeric(14, 3) not null check (quantidade > 0),
    valor_unitario numeric(14, 4) not null check (valor_unitario >= 0),
    criado_em timestamptz not null default now(),
    constraint historico_precos_compra_produto_unique unique (compra_id, produto_id, valor_unitario)
);

create index if not exists historico_precos_familia_produto_data_idx
    on public.historico_precos(familia_id, produto_id, data_compra desc);

-- ============================================================
-- RLS: leitura isolada por família. Escritas desta versão passam
-- exclusivamente pela função registrar_compra_nfce.
-- ============================================================

alter table public.categorias enable row level security;
alter table public.supermercados enable row level security;
alter table public.produtos enable row level security;
alter table public.compras enable row level security;
alter table public.itens_compra enable row level security;
alter table public.historico_precos enable row level security;

drop policy if exists categorias_select_familia on public.categorias;
drop policy if exists supermercados_select_familia on public.supermercados;
drop policy if exists produtos_select_familia on public.produtos;
drop policy if exists compras_select_familia on public.compras;
drop policy if exists itens_compra_select_familia on public.itens_compra;
drop policy if exists historico_select_familia on public.historico_precos;

create policy categorias_select_familia
on public.categorias for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy supermercados_select_familia
on public.supermercados for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy produtos_select_familia
on public.produtos for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy compras_select_familia
on public.compras for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy itens_compra_select_familia
on public.itens_compra for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

create policy historico_select_familia
on public.historico_precos for select
to authenticated
using ((select private.usuario_pertence_familia(familia_id)));

revoke all on public.categorias from anon, authenticated;
revoke all on public.supermercados from anon, authenticated;
revoke all on public.produtos from anon, authenticated;
revoke all on public.compras from anon, authenticated;
revoke all on public.itens_compra from anon, authenticated;
revoke all on public.historico_precos from anon, authenticated;

grant select on public.categorias to authenticated;
grant select on public.supermercados to authenticated;
grant select on public.produtos to authenticated;
grant select on public.compras to authenticated;
grant select on public.itens_compra to authenticated;
grant select on public.historico_precos to authenticated;

-- ============================================================
-- Registro atômico da compra. A família sempre é derivada da
-- sessão autenticada; familia_id nunca é aceito no payload.
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

        select p.id
          into v_produto_id
          from public.produtos p
         where p.familia_id = v_familia_id
           and p.nome_normalizado = v_descricao_normalizada
           and p.unidade_padrao = v_unidade
         limit 1;

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

revoke all on function public.registrar_compra_nfce(jsonb) from public, anon;
grant execute on function public.registrar_compra_nfce(jsonb) to authenticated;

commit;
