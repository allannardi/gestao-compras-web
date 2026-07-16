begin;

-- ============================================================
-- v0.6.1 — Entrada por link de convite
-- Execute depois de 007_configuracoes_familia_membros.sql.
-- ============================================================

create unique index if not exists uq_convites_familia_token_hash
    on public.convites_familia (token_hash)
    where token_hash is not null;

create or replace function private.hash_convite_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
    select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

revoke all on function private.hash_convite_token(text) from public, anon, authenticated;

-- Novo cadastro normal continua criando uma família própria. Quando o cadastro
-- contém convite_token nos metadados, o usuário entra diretamente na família
-- convidante e nenhuma família paralela é criada.
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
    v_convite_token text;
    v_convite public.convites_familia%rowtype;
begin
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
    v_familia_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'familia_nome', '')), '');
    v_convite_token := nullif(trim(coalesce(new.raw_user_meta_data ->> 'convite_token', '')), '');

    if v_nome is null then
        v_nome := split_part(coalesce(new.email, 'Usuário'), '@', 1);
    end if;

    if char_length(v_nome) < 2 then
        v_nome := 'Usuário';
    end if;

    if v_convite_token is not null then
        select *
          into v_convite
          from public.convites_familia c
         where c.token_hash = private.hash_convite_token(v_convite_token)
           and c.status = 'pendente'
           and c.expira_em > now()
         for update;

        if not found then
            raise exception using errcode = 'P0002', message = 'Convite inválido ou expirado.';
        end if;

        if lower(coalesce(new.email, '')) <> lower(v_convite.email) then
            raise exception using errcode = '42501', message = 'Este convite pertence a outro e-mail.';
        end if;

        insert into public.perfis (id, nome, email, familia_atual_id)
        values (
            new.id,
            left(v_nome, 100),
            coalesce(new.email, ''),
            v_convite.familia_id
        );

        insert into public.familia_membros (familia_id, usuario_id, papel, status)
        values (v_convite.familia_id, new.id, v_convite.papel, 'ativo')
        on conflict (familia_id, usuario_id) do update
           set papel = excluded.papel,
               status = 'ativo',
               atualizado_em = now();

        update public.convites_familia
           set status = 'aceito',
               atualizado_em = now()
         where id = v_convite.id;

        return new;
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

    return new;
end;
$$;

revoke all on function public.criar_familia_novo_usuario() from public, anon, authenticated;
grant execute on function public.criar_familia_novo_usuario() to supabase_auth_admin;

create or replace function public.criar_convite_familia(
    p_email text,
    p_papel text default 'membro'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_email text := lower(trim(coalesce(p_email, '')));
    v_papel text := lower(trim(coalesce(p_papel, 'membro')));
    v_limite integer;
    v_ocupacao integer;
    v_token text := encode(extensions.gen_random_bytes(32), 'hex');
    v_convite public.convites_familia%rowtype;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para convidar um membro.';
    end if;

    select p.familia_atual_id, cf.limite_usuarios
      into v_familia_id, v_limite
      from public.perfis p
      join public.configuracoes_familia cf
        on cf.familia_id = p.familia_atual_id
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem criar convites.';
    end if;

    if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception using errcode = '22023', message = 'Informe um e-mail válido.';
    end if;

    if v_papel not in ('administrador', 'membro') then
        raise exception using errcode = '22023', message = 'Papel de membro inválido.';
    end if;

    if exists (
        select 1
          from public.familia_membros fm
          join public.perfis p_membro on p_membro.id = fm.usuario_id
         where fm.familia_id = v_familia_id
           and fm.status = 'ativo'
           and lower(p_membro.email) = v_email
    ) then
        raise exception using errcode = '23505', message = 'Este e-mail já pertence à família.';
    end if;

    select
        (select count(*) from public.familia_membros fm where fm.familia_id = v_familia_id and fm.status = 'ativo')
        +
        (select count(*) from public.convites_familia c where c.familia_id = v_familia_id and c.status = 'pendente' and c.expira_em > now() and lower(c.email) <> v_email)
      into v_ocupacao;

    if v_ocupacao >= v_limite then
        raise exception using errcode = 'P0002', message = 'O limite atual de membros e convites da família foi atingido.';
    end if;

    select *
      into v_convite
      from public.convites_familia c
     where c.familia_id = v_familia_id
       and lower(c.email) = v_email
       and c.status = 'pendente'
     limit 1;

    if found then
        update public.convites_familia
           set papel = v_papel,
               token_hash = private.hash_convite_token(v_token),
               expira_em = now() + interval '7 days',
               atualizado_em = now(),
               convidado_por = v_usuario_id
         where id = v_convite.id
         returning * into v_convite;
    else
        insert into public.convites_familia (
            familia_id,
            email,
            papel,
            status,
            token_hash,
            convidado_por,
            expira_em
        ) values (
            v_familia_id,
            v_email,
            v_papel,
            'pendente',
            private.hash_convite_token(v_token),
            v_usuario_id,
            now() + interval '7 days'
        ) returning * into v_convite;
    end if;

    return jsonb_build_object(
        'id', v_convite.id,
        'email', v_convite.email,
        'papel', v_convite.papel,
        'status', v_convite.status,
        'token', v_token,
        'expira_em', v_convite.expira_em,
        'mensagem', 'Convite criado. Copie o link e envie para a pessoa.'
    );
end;
$$;

create or replace function public.gerar_link_convite_familia(p_convite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_token text := encode(extensions.gen_random_bytes(32), 'hex');
    v_convite public.convites_familia%rowtype;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para gerar o link.';
    end if;

    select p.familia_atual_id into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem gerar links de convite.';
    end if;

    update public.convites_familia
       set token_hash = private.hash_convite_token(v_token),
           expira_em = now() + interval '7 days',
           atualizado_em = now()
     where id = p_convite_id
       and familia_id = v_familia_id
       and status = 'pendente'
     returning * into v_convite;

    if not found then
        raise exception using errcode = 'P0002', message = 'Convite pendente não encontrado.';
    end if;

    return jsonb_build_object(
        'id', v_convite.id,
        'email', v_convite.email,
        'papel', v_convite.papel,
        'status', v_convite.status,
        'token', v_token,
        'expira_em', v_convite.expira_em,
        'mensagem', 'Novo link de convite gerado.'
    );
end;
$$;

create or replace function public.consultar_convite_publico(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_convite public.convites_familia%rowtype;
    v_familia_nome text;
    v_convidado_por_nome text;
begin
    if char_length(coalesce(p_token, '')) < 32 then
        raise exception using errcode = '22023', message = 'Link de convite inválido.';
    end if;

    select *
      into v_convite
      from public.convites_familia c
     where c.token_hash = private.hash_convite_token(p_token)
     limit 1;

    if not found then
        raise exception using errcode = 'P0002', message = 'Convite não encontrado.';
    end if;

    select f.nome, coalesce(p.nome, 'Administrador')
      into v_familia_nome, v_convidado_por_nome
      from public.familias f
      left join public.perfis p on p.id = v_convite.convidado_por
     where f.id = v_convite.familia_id;

    if v_convite.status <> 'pendente' then
        raise exception using errcode = 'P0003', message = 'Este convite já foi utilizado ou cancelado.';
    end if;

    if v_convite.expira_em <= now() then
        update public.convites_familia
           set status = 'expirado', atualizado_em = now()
         where id = v_convite.id;
        raise exception using errcode = 'P0004', message = 'Este convite expirou. Peça um novo link ao administrador.';
    end if;

    return jsonb_build_object(
        'id', v_convite.id,
        'familia_id', v_convite.familia_id,
        'familia_nome', v_familia_nome,
        'email', v_convite.email,
        'papel', v_convite.papel,
        'expira_em', v_convite.expira_em,
        'convidado_por_nome', v_convidado_por_nome
    );
end;
$$;

create or replace function public.aceitar_convite_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_email text;
    v_convite public.convites_familia%rowtype;
    v_limite integer;
    v_membros integer;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para aceitar o convite.';
    end if;

    select lower(p.email) into v_email
      from public.perfis p
     where p.id = v_usuario_id;

    select *
      into v_convite
      from public.convites_familia c
     where c.token_hash = private.hash_convite_token(p_token)
       and c.status = 'pendente'
       and c.expira_em > now()
     for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Convite inválido, expirado ou já utilizado.';
    end if;

    if lower(v_convite.email) <> v_email then
        raise exception using errcode = '42501', message = 'Este convite pertence a outro e-mail.';
    end if;

    select cf.limite_usuarios into v_limite
      from public.configuracoes_familia cf
     where cf.familia_id = v_convite.familia_id;

    select count(*) into v_membros
      from public.familia_membros fm
     where fm.familia_id = v_convite.familia_id
       and fm.status = 'ativo';

    if v_membros >= v_limite and not exists (
        select 1 from public.familia_membros fm
         where fm.familia_id = v_convite.familia_id
           and fm.usuario_id = v_usuario_id
           and fm.status = 'ativo'
    ) then
        raise exception using errcode = 'P0003', message = 'A família atingiu o limite atual de membros.';
    end if;

    insert into public.familia_membros (familia_id, usuario_id, papel, status)
    values (v_convite.familia_id, v_usuario_id, v_convite.papel, 'ativo')
    on conflict (familia_id, usuario_id) do update
       set papel = excluded.papel,
           status = 'ativo',
           atualizado_em = now();

    update public.perfis
       set familia_atual_id = v_convite.familia_id,
           atualizado_em = now()
     where id = v_usuario_id;

    update public.convites_familia
       set status = 'aceito',
           atualizado_em = now()
     where id = v_convite.id;

    return jsonb_build_object(
        'familia_id', v_convite.familia_id,
        'mensagem', 'Convite aceito. Você entrou na família compartilhada.'
    );
end;
$$;

revoke all on function public.criar_convite_familia(text, text) from public, anon;
revoke all on function public.gerar_link_convite_familia(uuid) from public, anon;
revoke all on function public.consultar_convite_publico(text) from public;
revoke all on function public.aceitar_convite_por_token(text) from public, anon;

grant execute on function public.criar_convite_familia(text, text) to authenticated;
grant execute on function public.gerar_link_convite_familia(uuid) to authenticated;
grant execute on function public.consultar_convite_publico(text) to anon, authenticated;
grant execute on function public.aceitar_convite_por_token(text) to authenticated;

commit;
