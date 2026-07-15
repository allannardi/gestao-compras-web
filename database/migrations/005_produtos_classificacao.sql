begin;

-- ============================================================
-- v0.4.0 — Produtos, categorias e classificação automática
-- Execute depois de 004_operacao_historico.sql.
-- ============================================================

create or replace function private.texto_classificacao(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
    select translate(
        lower(regexp_replace(trim(coalesce(p_texto, '')), '\s+', ' ', 'g')),
        'áàãâäéèêëíìîïóòõôöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
    );
$$;

create or replace function private.sugerir_categoria_produto(p_nome text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_nome text := private.texto_classificacao(p_nome);
begin
    if v_nome = '' then
        return null;
    end if;

    if v_nome ~ '(salgad|bolach|biscoit|chips|snack|chocolate|bombom|doce|pipoca|amendoim|paçoca|pacoca)' then
        return 'Alimentos secundários';
    end if;

    if v_nome ~ '(refrigerante|suco|agua mineral|agua com gas|energetico|isotonico|cha pronto|agua de coco)' then
        return 'Bebidas';
    end if;

    if v_nome ~ '(arroz|feijao|macarrao|massa|farinha|fuba|oleo|azeite|acucar|\msal\M|cafe|molho de tomate|extrato de tomate|milho|ervilha)' then
        return 'Alimentos básicos';
    end if;

    if v_nome ~ '(carne|frango|peixe|linguica|bisteca|costela|patinho|acém|acem|picanha|pernil|presunto cru|\movo\M|\movos\M)' then
        return 'Carnes e ovos';
    end if;

    if v_nome ~ '(leite|queijo|iogurte|manteiga|margarina|requeijao|creme de leite|leite condensado|nata|mussarela|muçarela|mucarela|presunto|mortadela|peito de peru)' then
        return 'Frios e laticínios';
    end if;

    if v_nome ~ '(banana|\mmaca\M|\mmaca\M|laranja|limao|tomate|cebola|batata|cenoura|alface|repolho|abacaxi|mamao|melancia|\muva\M|morango|pepino|abobrinha|mandioca|\malho\M|hortifruti)' then
        return 'Hortifruti';
    end if;

    if v_nome ~ '(\mpao\M|\mpaes\M|bolo|torrada|bisnaga|croissant|sonho|rosca|panetone)' then
        return 'Padaria';
    end if;

    if v_nome ~ '(shampoo|condicionador|sabonete|pasta dental|creme dental|escova dental|desodorante|papel higienico|absorvente|fralda|fio dental|enxaguante|barbeador)' then
        return 'Higiene pessoal';
    end if;

    if v_nome ~ '(detergente|sabao|amaciante|desinfetante|agua sanitaria|esponja|limpador|multiuso|alvejante|lava roupas|lava loucas|saco de lixo|papel toalha)' then
        return 'Limpeza';
    end if;

    if v_nome ~ '(racao|petisco pet|areia gato|areia para gato|tapete higienico|sache gato|sache cao)' then
        return 'Pet';
    end if;

    return null;
end;
$$;

create or replace function private.garantir_categorias_padrao(p_familia_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.categorias (
        familia_id,
        nome,
        nome_normalizado,
        sistema,
        ativo
    )
    select
        p_familia_id,
        categoria.nome,
        private.normalizar_texto(categoria.nome),
        true,
        true
    from (
        values
            ('Não classificado'),
            ('Alimentos básicos'),
            ('Alimentos secundários'),
            ('Bebidas'),
            ('Carnes e ovos'),
            ('Frios e laticínios'),
            ('Hortifruti'),
            ('Padaria'),
            ('Higiene pessoal'),
            ('Limpeza'),
            ('Pet'),
            ('Outros')
    ) as categoria(nome)
    on conflict (familia_id, nome_normalizado)
    do update set
        ativo = true,
        atualizado_em = now();
end;
$$;

revoke all on function private.texto_classificacao(text) from public;
revoke all on function private.sugerir_categoria_produto(text) from public;
revoke all on function private.garantir_categorias_padrao(uuid) from public;

-- Categorias para todas as famílias que já existem.
do $$
declare
    v_familia record;
begin
    for v_familia in select id from public.familias loop
        perform private.garantir_categorias_padrao(v_familia.id);
    end loop;
end;
$$;

-- Novas famílias também recebem as categorias padrão automaticamente.
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

    perform private.garantir_categorias_padrao(v_familia_id);

    return new;
end;
$$;

-- Classificação automática apenas no primeiro cadastro do produto.
create or replace function private.classificar_produto_novo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_categoria_atual text;
    v_sugestao text;
    v_categoria_id uuid;
begin
    if new.categoria_id is not null then
        select c.nome_normalizado
          into v_categoria_atual
          from public.categorias c
         where c.id = new.categoria_id
           and c.familia_id = new.familia_id;
    end if;

    if new.categoria_id is null
       or v_categoria_atual = private.normalizar_texto('Não classificado') then
        v_sugestao := private.sugerir_categoria_produto(new.nome);

        if v_sugestao is not null then
            insert into public.categorias (
                familia_id,
                nome,
                nome_normalizado,
                sistema,
                ativo
            ) values (
                new.familia_id,
                v_sugestao,
                private.normalizar_texto(v_sugestao),
                true,
                true
            )
            on conflict (familia_id, nome_normalizado)
            do update set ativo = true, atualizado_em = now()
            returning id into v_categoria_id;

            new.categoria_id := v_categoria_id;
            new.revisar := false;
        else
            new.revisar := true;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists produtos_classificacao_automatica on public.produtos;
create trigger produtos_classificacao_automatica
    before insert on public.produtos
    for each row execute procedure private.classificar_produto_novo();

revoke all on function private.classificar_produto_novo() from public;

create or replace function public.listar_categorias_familia()
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
        raise exception using errcode = '42501', message = 'Faça login para consultar as categorias.';
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
                'id', c.id,
                'nome', c.nome,
                'sistema', c.sistema,
                'ativo', c.ativo,
                'produtos_count', (
                    select count(*)
                      from public.produtos p
                     where p.familia_id = v_familia_id
                       and p.categoria_id = c.id
                       and p.ativo = true
                )
            ) order by
                case when c.nome_normalizado = private.normalizar_texto('Não classificado') then 0 else 1 end,
                c.nome asc
        ),
        '[]'::jsonb
    )
      into v_resultado
      from public.categorias c
     where c.familia_id = v_familia_id
       and c.ativo = true;

    return v_resultado;
end;
$$;

create or replace function public.listar_produtos_familia(
    p_limite integer default 30,
    p_offset integer default 0,
    p_busca text default null,
    p_somente_revisar boolean default false,
    p_categoria_id uuid default null
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
    v_limite integer := least(greatest(coalesce(p_limite, 30), 1), 101);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
    v_produtos jsonb;
    v_total integer;
    v_para_revisar integer;
    v_filtrados integer;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para consultar os produtos.';
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

    select count(*)::integer,
           count(*) filter (where p.revisar = true)::integer
      into v_total, v_para_revisar
      from public.produtos p
     where p.familia_id = v_familia_id
       and p.ativo = true;

    select count(*)::integer
      into v_filtrados
      from public.produtos p
     where p.familia_id = v_familia_id
       and p.ativo = true
       and (v_busca is null or private.texto_classificacao(p.nome || ' ' || coalesce(p.marca, '')) like '%' || private.texto_classificacao(v_busca) || '%')
       and (not coalesce(p_somente_revisar, false) or p.revisar = true)
       and (p_categoria_id is null or p.categoria_id = p_categoria_id);

    select coalesce(jsonb_agg(to_jsonb(produto) order by produto.revisar desc, produto.nome asc), '[]'::jsonb)
      into v_produtos
      from (
        select
            p.id,
            p.nome,
            coalesce(p.marca, '')::text as marca,
            p.unidade_padrao,
            p.revisar,
            p.categoria_id,
            coalesce(c.nome, 'Não classificado')::text as categoria_nome,
            (
                select count(distinct i.compra_id)
                  from public.itens_compra i
                 where i.familia_id = v_familia_id
                   and i.produto_id = p.id
            )::integer as compras_count,
            ultimo.data_compra as ultima_compra,
            ultimo.valor_unitario as ultimo_valor_unitario,
            p.atualizado_em
          from public.produtos p
          left join public.categorias c
            on c.id = p.categoria_id
           and c.familia_id = v_familia_id
          left join lateral (
            select h.data_compra, h.valor_unitario
              from public.historico_precos h
             where h.familia_id = v_familia_id
               and h.produto_id = p.id
             order by h.data_compra desc, h.criado_em desc
             limit 1
          ) ultimo on true
         where p.familia_id = v_familia_id
           and p.ativo = true
           and (v_busca is null or private.texto_classificacao(p.nome || ' ' || coalesce(p.marca, '')) like '%' || private.texto_classificacao(v_busca) || '%')
           and (not coalesce(p_somente_revisar, false) or p.revisar = true)
           and (p_categoria_id is null or p.categoria_id = p_categoria_id)
         order by p.revisar desc, p.nome asc
         limit v_limite
        offset v_offset
      ) produto;

    return jsonb_build_object(
        'produtos', v_produtos,
        'total', v_total,
        'para_revisar', v_para_revisar,
        'classificados', greatest(v_total - v_para_revisar, 0),
        'filtrados', v_filtrados,
        'limite', least(v_limite, 100),
        'offset', v_offset,
        'proximo_offset', case when v_offset + least(v_limite, 100) < v_filtrados then v_offset + least(v_limite, 100) else null end,
        'tem_mais', v_offset + least(v_limite, 100) < v_filtrados
    );
end;
$$;

create or replace function public.atualizar_produto_familia(
    p_produto_id uuid,
    p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_categoria_id uuid;
    v_categoria_nome text;
    v_nome text;
    v_marca text;
    v_unidade text;
    v_revisar boolean;
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para editar o produto.';
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

    if not exists (
        select 1 from public.produtos p
         where p.id = p_produto_id
           and p.familia_id = v_familia_id
           and p.ativo = true
    ) then
        raise exception using errcode = 'P0002', message = 'Produto não encontrado nesta família.';
    end if;

    v_nome := left(trim(coalesce(p_payload ->> 'nome', '')), 240);
    v_marca := nullif(left(trim(coalesce(p_payload ->> 'marca', '')), 100), '');
    v_unidade := lower(left(coalesce(nullif(trim(p_payload ->> 'unidade_padrao'), ''), 'un'), 20));
    v_categoria_id := nullif(p_payload ->> 'categoria_id', '')::uuid;

    if v_nome = '' then
        raise exception using errcode = '22023', message = 'Informe o nome do produto.';
    end if;

    select c.nome
      into v_categoria_nome
      from public.categorias c
     where c.id = v_categoria_id
       and c.familia_id = v_familia_id
       and c.ativo = true;

    if v_categoria_nome is null then
        raise exception using errcode = '22023', message = 'Selecione uma categoria válida da sua família.';
    end if;

    v_revisar := private.normalizar_texto(v_categoria_nome) = private.normalizar_texto('Não classificado');

    update public.produtos
       set nome = v_nome,
           nome_normalizado = private.normalizar_texto(v_nome),
           marca = v_marca,
           unidade_padrao = v_unidade,
           categoria_id = v_categoria_id,
           revisar = v_revisar,
           atualizado_em = now()
     where id = p_produto_id
       and familia_id = v_familia_id;

    select jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'marca', coalesce(p.marca, ''),
        'unidade_padrao', p.unidade_padrao,
        'revisar', p.revisar,
        'categoria_id', p.categoria_id,
        'categoria_nome', c.nome,
        'mensagem', 'Produto atualizado com sucesso.'
    )
      into v_resultado
      from public.produtos p
      join public.categorias c
        on c.id = p.categoria_id
       and c.familia_id = v_familia_id
     where p.id = p_produto_id
       and p.familia_id = v_familia_id;

    return v_resultado;
exception
    when unique_violation then
        raise exception using
            errcode = '23505',
            message = 'Já existe um produto com este nome e unidade nesta família.';
end;
$$;

create or replace function public.criar_categoria_familia(p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_nome text := left(trim(coalesce(p_nome, '')), 80);
    v_categoria_id uuid;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para criar uma categoria.';
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

    if char_length(v_nome) < 2 then
        raise exception using errcode = '22023', message = 'Informe um nome de categoria válido.';
    end if;

    insert into public.categorias (
        familia_id,
        nome,
        nome_normalizado,
        sistema,
        ativo
    ) values (
        v_familia_id,
        v_nome,
        private.normalizar_texto(v_nome),
        false,
        true
    )
    on conflict (familia_id, nome_normalizado)
    do update set ativo = true, atualizado_em = now()
    returning id into v_categoria_id;

    return jsonb_build_object(
        'id', v_categoria_id,
        'nome', v_nome,
        'mensagem', 'Categoria disponível para uso.'
    );
end;
$$;

create or replace function public.reclassificar_produtos_familia()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_produto record;
    v_sugestao text;
    v_categoria_id uuid;
    v_classificados integer := 0;
    v_pendentes integer := 0;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para reclassificar os produtos.';
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

    perform private.garantir_categorias_padrao(v_familia_id);

    for v_produto in
        select p.id, p.nome
          from public.produtos p
          left join public.categorias c
            on c.id = p.categoria_id
           and c.familia_id = v_familia_id
         where p.familia_id = v_familia_id
           and p.ativo = true
           and p.revisar = true
           and (
                p.categoria_id is null
                or c.nome_normalizado = private.normalizar_texto('Não classificado')
           )
    loop
        v_sugestao := private.sugerir_categoria_produto(v_produto.nome);

        if v_sugestao is not null then
            select c.id
              into v_categoria_id
              from public.categorias c
             where c.familia_id = v_familia_id
               and c.nome_normalizado = private.normalizar_texto(v_sugestao)
             limit 1;

            update public.produtos
               set categoria_id = v_categoria_id,
                   revisar = false,
                   atualizado_em = now()
             where id = v_produto.id
               and familia_id = v_familia_id;

            v_classificados := v_classificados + 1;
        else
            v_pendentes := v_pendentes + 1;
        end if;
    end loop;

    return jsonb_build_object(
        'classificados', v_classificados,
        'pendentes', v_pendentes,
        'mensagem', case
            when v_classificados > 0 then 'Reclassificação concluída.'
            else 'Nenhum produto pendente encontrou uma regra automática.'
        end
    );
end;
$$;

revoke all on function public.listar_categorias_familia() from public, anon;
revoke all on function public.listar_produtos_familia(integer, integer, text, boolean, uuid) from public, anon;
revoke all on function public.atualizar_produto_familia(uuid, jsonb) from public, anon;
revoke all on function public.criar_categoria_familia(text) from public, anon;
revoke all on function public.reclassificar_produtos_familia() from public, anon;

grant execute on function public.listar_categorias_familia() to authenticated;
grant execute on function public.listar_produtos_familia(integer, integer, text, boolean, uuid) to authenticated;
grant execute on function public.atualizar_produto_familia(uuid, jsonb) to authenticated;
grant execute on function public.criar_categoria_familia(text) to authenticated;
grant execute on function public.reclassificar_produtos_familia() to authenticated;

commit;
