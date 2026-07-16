begin;

-- ============================================================
-- v0.6.0 — Configurações da família, membros e convites
-- Execute depois de 006_dashboard_historico_precos.sql.
-- ============================================================

create unique index if not exists uq_convites_familia_pendente_email
    on public.convites_familia (familia_id, lower(email))
    where status = 'pendente';

-- Retorna configurações, membros, famílias disponíveis e convites.
create or replace function public.obter_configuracoes_familia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_email text;
    v_papel text;
    v_resultado jsonb;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para abrir as configurações.';
    end if;

    select p.familia_atual_id, p.email, fm.papel
      into v_familia_id, v_email, v_papel
      from public.perfis p
      join public.familia_membros fm
        on fm.familia_id = p.familia_atual_id
       and fm.usuario_id = p.id
       and fm.status = 'ativo'
     where p.id = v_usuario_id
     limit 1;

    if v_familia_id is null then
        raise exception using errcode = 'P0001', message = 'A família atual do usuário não foi encontrada.';
    end if;

    select jsonb_build_object(
        'perfil', jsonb_build_object(
            'id', p.id,
            'nome', p.nome,
            'email', p.email
        ),
        'familia', jsonb_build_object(
            'id', f.id,
            'nome', f.nome,
            'plano', f.plano,
            'status', f.status,
            'papel', v_papel,
            'membros_count', (
                select count(*)
                  from public.familia_membros fm_count
                 where fm_count.familia_id = f.id
                   and fm_count.status = 'ativo'
            ),
            'limite_usuarios', cf.limite_usuarios
        ),
        'familias_disponiveis', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', f_lista.id,
                    'nome', f_lista.nome,
                    'papel', fm_lista.papel,
                    'atual', f_lista.id = v_familia_id
                ) order by (f_lista.id = v_familia_id) desc, f_lista.nome asc
            )
              from public.familia_membros fm_lista
              join public.familias f_lista
                on f_lista.id = fm_lista.familia_id
             where fm_lista.usuario_id = v_usuario_id
               and fm_lista.status = 'ativo'
               and f_lista.status = 'ativa'
        ), '[]'::jsonb),
        'membros', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'usuario_id', fm_membro.usuario_id,
                    'nome', coalesce(p_membro.nome, split_part(p_membro.email, '@', 1)),
                    'email', p_membro.email,
                    'papel', fm_membro.papel,
                    'status', fm_membro.status,
                    'criado_em', fm_membro.criado_em,
                    'atual', fm_membro.usuario_id = v_usuario_id
                ) order by
                    case when fm_membro.papel = 'administrador' then 0 else 1 end,
                    coalesce(p_membro.nome, p_membro.email) asc
            )
              from public.familia_membros fm_membro
              join public.perfis p_membro
                on p_membro.id = fm_membro.usuario_id
             where fm_membro.familia_id = v_familia_id
               and fm_membro.status = 'ativo'
        ), '[]'::jsonb),
        'convites_enviados', case
            when v_papel = 'administrador' then coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'email', c.email,
                        'papel', c.papel,
                        'status', c.status,
                        'expira_em', c.expira_em,
                        'criado_em', c.criado_em
                    ) order by c.criado_em desc
                )
                  from public.convites_familia c
                 where c.familia_id = v_familia_id
                   and c.status = 'pendente'
                   and c.expira_em > now()
            ), '[]'::jsonb)
            else '[]'::jsonb
        end,
        'convites_recebidos', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', c_recebido.id,
                    'familia_id', c_recebido.familia_id,
                    'familia_nome', f_recebida.nome,
                    'papel', c_recebido.papel,
                    'expira_em', c_recebido.expira_em,
                    'convidado_por_nome', coalesce(p_convite.nome, 'Administrador')
                ) order by c_recebido.criado_em desc
            )
              from public.convites_familia c_recebido
              join public.familias f_recebida
                on f_recebida.id = c_recebido.familia_id
              left join public.perfis p_convite
                on p_convite.id = c_recebido.convidado_por
             where lower(c_recebido.email) = lower(v_email)
               and c_recebido.status = 'pendente'
               and c_recebido.expira_em > now()
               and not exists (
                    select 1
                      from public.familia_membros fm_existente
                     where fm_existente.familia_id = c_recebido.familia_id
                       and fm_existente.usuario_id = v_usuario_id
                       and fm_existente.status = 'ativo'
               )
        ), '[]'::jsonb)
    )
      into v_resultado
      from public.perfis p
      join public.familias f
        on f.id = v_familia_id
      join public.configuracoes_familia cf
        on cf.familia_id = f.id
     where p.id = v_usuario_id;

    return v_resultado;
end;
$$;

create or replace function public.atualizar_meu_perfil(p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_nome text := trim(coalesce(p_nome, ''));
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para atualizar seu perfil.';
    end if;

    if char_length(v_nome) < 2 or char_length(v_nome) > 100 then
        raise exception using errcode = '22023', message = 'Informe um nome entre 2 e 100 caracteres.';
    end if;

    update public.perfis
       set nome = v_nome,
           atualizado_em = now()
     where id = v_usuario_id;

    return jsonb_build_object(
        'nome', v_nome,
        'mensagem', 'Seu nome foi atualizado.'
    );
end;
$$;

create or replace function public.atualizar_nome_familia(p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_nome text := trim(coalesce(p_nome, ''));
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para atualizar a família.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem alterar o nome da família.';
    end if;

    if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
        raise exception using errcode = '22023', message = 'Informe um nome entre 2 e 80 caracteres.';
    end if;

    update public.familias
       set nome = v_nome,
           atualizado_em = now()
     where id = v_familia_id;

    return jsonb_build_object(
        'nome', v_nome,
        'mensagem', 'Nome da família atualizado.'
    );
end;
$$;

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
            convidado_por,
            expira_em
        ) values (
            v_familia_id,
            v_email,
            v_papel,
            'pendente',
            v_usuario_id,
            now() + interval '7 days'
        ) returning * into v_convite;
    end if;

    return jsonb_build_object(
        'id', v_convite.id,
        'email', v_convite.email,
        'papel', v_convite.papel,
        'status', v_convite.status,
        'expira_em', v_convite.expira_em,
        'mensagem', 'Convite criado. Peça para a pessoa entrar com este e-mail.'
    );
end;
$$;

create or replace function public.cancelar_convite_familia(p_convite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para cancelar o convite.';
    end if;

    select p.familia_atual_id into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem cancelar convites.';
    end if;

    update public.convites_familia
       set status = 'cancelado',
           atualizado_em = now()
     where id = p_convite_id
       and familia_id = v_familia_id
       and status = 'pendente';

    if not found then
        raise exception using errcode = 'P0002', message = 'Convite pendente não encontrado.';
    end if;

    return jsonb_build_object('mensagem', 'Convite cancelado.');
end;
$$;

create or replace function public.aceitar_convite_familia(p_convite_id uuid)
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
     where c.id = p_convite_id
       and c.status = 'pendente'
       and c.expira_em > now()
     for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Convite inválido ou expirado.';
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
        select 1
          from public.familia_membros fm
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

create or replace function public.selecionar_familia_atual(p_familia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_nome text;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para trocar de família.';
    end if;

    select f.nome into v_nome
      from public.familia_membros fm
      join public.familias f on f.id = fm.familia_id
     where fm.familia_id = p_familia_id
       and fm.usuario_id = v_usuario_id
       and fm.status = 'ativo'
       and f.status = 'ativa';

    if v_nome is null then
        raise exception using errcode = 'P0002', message = 'Você não possui acesso a esta família.';
    end if;

    update public.perfis
       set familia_atual_id = p_familia_id,
           atualizado_em = now()
     where id = v_usuario_id;

    return jsonb_build_object(
        'familia_id', p_familia_id,
        'familia_nome', v_nome,
        'mensagem', 'Família atualizada.'
    );
end;
$$;

create or replace function public.alterar_papel_membro_familia(
    p_usuario_id uuid,
    p_papel text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_papel_atual text;
    v_novo_papel text := lower(trim(coalesce(p_papel, '')));
    v_admins integer;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para alterar o papel do membro.';
    end if;

    select p.familia_atual_id into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem alterar papéis.';
    end if;

    if v_novo_papel not in ('administrador', 'membro') then
        raise exception using errcode = '22023', message = 'Papel de membro inválido.';
    end if;

    select fm.papel into v_papel_atual
      from public.familia_membros fm
     where fm.familia_id = v_familia_id
       and fm.usuario_id = p_usuario_id
       and fm.status = 'ativo';

    if v_papel_atual is null then
        raise exception using errcode = 'P0002', message = 'Membro não encontrado nesta família.';
    end if;

    if v_papel_atual = 'administrador' and v_novo_papel = 'membro' then
        select count(*) into v_admins
          from public.familia_membros fm
         where fm.familia_id = v_familia_id
           and fm.status = 'ativo'
           and fm.papel = 'administrador';

        if v_admins <= 1 then
            raise exception using errcode = 'P0003', message = 'A família precisa manter pelo menos um administrador.';
        end if;
    end if;

    update public.familia_membros
       set papel = v_novo_papel,
           atualizado_em = now()
     where familia_id = v_familia_id
       and usuario_id = p_usuario_id;

    return jsonb_build_object('mensagem', 'Papel do membro atualizado.');
end;
$$;

create or replace function public.remover_membro_familia(p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_papel_alvo text;
    v_admins integer;
    v_familia_alternativa uuid;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para remover um membro.';
    end if;

    select p.familia_atual_id into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem remover membros.';
    end if;

    if p_usuario_id = v_usuario_id then
        raise exception using errcode = '22023', message = 'Use outra conta administradora para remover seu próprio acesso.';
    end if;

    select fm.papel into v_papel_alvo
      from public.familia_membros fm
     where fm.familia_id = v_familia_id
       and fm.usuario_id = p_usuario_id
       and fm.status = 'ativo';

    if v_papel_alvo is null then
        raise exception using errcode = 'P0002', message = 'Membro não encontrado nesta família.';
    end if;

    if v_papel_alvo = 'administrador' then
        select count(*) into v_admins
          from public.familia_membros fm
         where fm.familia_id = v_familia_id
           and fm.status = 'ativo'
           and fm.papel = 'administrador';

        if v_admins <= 1 then
            raise exception using errcode = 'P0003', message = 'A família precisa manter pelo menos um administrador.';
        end if;
    end if;

    select fm.familia_id into v_familia_alternativa
      from public.familia_membros fm
     where fm.usuario_id = p_usuario_id
       and fm.familia_id <> v_familia_id
       and fm.status = 'ativo'
     order by fm.criado_em asc
     limit 1;

    if v_familia_alternativa is null then
        raise exception using errcode = 'P0004', message = 'Este membro não possui outra família ativa para retornar.';
    end if;

    update public.familia_membros
       set status = 'inativo',
           atualizado_em = now()
     where familia_id = v_familia_id
       and usuario_id = p_usuario_id;

    update public.perfis
       set familia_atual_id = v_familia_alternativa,
           atualizado_em = now()
     where id = p_usuario_id
       and familia_atual_id = v_familia_id;

    return jsonb_build_object('mensagem', 'Membro removido da família.');
end;
$$;

-- Privilégios das novas funções. A autorização por família permanece dentro de cada RPC.
revoke all on function public.obter_configuracoes_familia() from public, anon;
revoke all on function public.atualizar_meu_perfil(text) from public, anon;
revoke all on function public.atualizar_nome_familia(text) from public, anon;
revoke all on function public.criar_convite_familia(text, text) from public, anon;
revoke all on function public.cancelar_convite_familia(uuid) from public, anon;
revoke all on function public.aceitar_convite_familia(uuid) from public, anon;
revoke all on function public.selecionar_familia_atual(uuid) from public, anon;
revoke all on function public.alterar_papel_membro_familia(uuid, text) from public, anon;
revoke all on function public.remover_membro_familia(uuid) from public, anon;

grant execute on function public.obter_configuracoes_familia() to authenticated;
grant execute on function public.atualizar_meu_perfil(text) to authenticated;
grant execute on function public.atualizar_nome_familia(text) to authenticated;
grant execute on function public.criar_convite_familia(text, text) to authenticated;
grant execute on function public.cancelar_convite_familia(uuid) to authenticated;
grant execute on function public.aceitar_convite_familia(uuid) to authenticated;
grant execute on function public.selecionar_familia_atual(uuid) to authenticated;
grant execute on function public.alterar_papel_membro_familia(uuid, text) to authenticated;
grant execute on function public.remover_membro_familia(uuid) to authenticated;

commit;
