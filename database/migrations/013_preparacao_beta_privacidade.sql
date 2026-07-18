begin;

-- ============================================================
-- v0.9.0 — Preparação para beta, privacidade e exclusão segura
-- Execute depois de 012_exportacao_backup.sql.
-- ============================================================

-- Estado individual do guia inicial.
alter table public.perfis
    add column if not exists onboarding_concluido_em timestamptz;

alter table public.perfis
    add column if not exists privacidade_vista_em timestamptz;

-- Preserva o histórico quando uma conta é excluída.
alter table public.compras
    alter column criado_por drop not null;

alter table public.compras
    drop constraint if exists compras_criado_por_fkey;

alter table public.compras
    add constraint compras_criado_por_fkey
    foreign key (criado_por)
    references auth.users(id)
    on delete set null;

alter table public.convites_familia
    alter column convidado_por drop not null;

alter table public.convites_familia
    drop constraint if exists convites_familia_convidado_por_fkey;

alter table public.convites_familia
    add constraint convites_familia_convidado_por_fkey
    foreign key (convidado_por)
    references auth.users(id)
    on delete set null;

-- Quando a última conta sai de uma família, elimina também o espaço órfão.
create or replace function private.limpar_familia_sem_membros()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if exists (
        select 1
          from public.familias f
         where f.id = old.familia_id
    )
    and not exists (
        select 1
          from public.familia_membros fm
         where fm.familia_id = old.familia_id
           and fm.status = 'ativo'
    ) then
        delete from public.familias
         where id = old.familia_id;
    end if;

    return old;
end;
$$;

revoke all on function private.limpar_familia_sem_membros() from public, anon, authenticated;

drop trigger if exists familia_membros_limpa_familia_vazia
    on public.familia_membros;

create trigger familia_membros_limpa_familia_vazia
    after delete on public.familia_membros
    for each row execute procedure private.limpar_familia_sem_membros();

-- ============================================================
-- Guia inicial / preparação para beta
-- ============================================================

create or replace function public.obter_onboarding_beta()
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
    v_concluido_em timestamptz;
    v_compras_count integer := 0;
    v_produtos_count integer := 0;
    v_produtos_revisar_count integer := 0;
    v_membros_count integer := 0;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar o guia inicial.';
    end if;

    select p.familia_atual_id, fm.papel, p.onboarding_concluido_em
      into v_familia_id, v_papel, v_concluido_em
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

    select count(*)::integer
      into v_compras_count
      from public.compras c
     where c.familia_id = v_familia_id
       and c.status <> 'excluida';

    select
        count(*)::integer,
        count(*) filter (where p.revisar = true)::integer
      into v_produtos_count, v_produtos_revisar_count
      from public.produtos p
     where p.familia_id = v_familia_id
       and p.ativo = true;

    select count(*)::integer
      into v_membros_count
      from public.familia_membros fm
     where fm.familia_id = v_familia_id
       and fm.status = 'ativo';

    return jsonb_build_object(
        'mostrar', v_papel = 'administrador' and v_concluido_em is null,
        'concluido_em', v_concluido_em,
        'papel', v_papel,
        'compras_count', v_compras_count,
        'produtos_count', v_produtos_count,
        'produtos_revisar_count', v_produtos_revisar_count,
        'membros_count', v_membros_count,
        'primeira_compra_concluida', v_compras_count > 0,
        'revisao_produtos_concluida', v_produtos_count > 0 and v_produtos_revisar_count = 0,
        'membro_adicional_concluido', v_membros_count > 1,
        'etapas_principais_concluidas',
            v_compras_count > 0
            and v_produtos_count > 0
            and v_produtos_revisar_count = 0
    );
end;
$$;

create or replace function public.concluir_onboarding_beta()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_concluido_em timestamptz := now();
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para concluir o guia inicial.';
    end if;

    update public.perfis
       set onboarding_concluido_em = v_concluido_em,
           atualizado_em = now()
     where id = v_usuario_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Perfil não encontrado.';
    end if;

    return jsonb_build_object(
        'mensagem', 'Guia inicial concluído.',
        'concluido_em', v_concluido_em
    );
end;
$$;

create or replace function public.registrar_visualizacao_privacidade()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_visto_em timestamptz := now();
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar a privacidade.';
    end if;

    update public.perfis
       set privacidade_vista_em = coalesce(privacidade_vista_em, v_visto_em),
           atualizado_em = now()
     where id = v_usuario_id;

    return jsonb_build_object(
        'mensagem', 'Informações de privacidade registradas.',
        'visto_em', v_visto_em
    );
end;
$$;

-- ============================================================
-- Exclusão da própria conta
-- ============================================================

create or replace function public.preparar_exclusao_minha_conta(
    p_email_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_email text;
    v_familias_count integer := 0;
    v_familias_exclusivas_count integer := 0;
    v_familias_bloqueadas text;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login novamente para excluir sua conta.';
    end if;

    select lower(trim(coalesce(u.email, '')))
      into v_email
      from auth.users u
     where u.id = v_usuario_id
     limit 1;

    if v_email is null or v_email = '' then
        raise exception using
            errcode = 'P0002',
            message = 'Conta de autenticação não encontrada.';
    end if;

    if lower(trim(coalesce(p_email_confirmacao, ''))) <> v_email then
        raise exception using
            errcode = '22023',
            message = 'Digite exatamente o e-mail da sua conta para confirmar a exclusão.';
    end if;

    select string_agg(f.nome, ', ' order by f.nome)
      into v_familias_bloqueadas
      from public.familia_membros fm
      join public.familias f on f.id = fm.familia_id
     where fm.usuario_id = v_usuario_id
       and fm.status = 'ativo'
       and fm.papel = 'administrador'
       and exists (
            select 1
              from public.familia_membros outro
             where outro.familia_id = fm.familia_id
               and outro.usuario_id <> v_usuario_id
               and outro.status = 'ativo'
       )
       and not exists (
            select 1
              from public.familia_membros outro_admin
             where outro_admin.familia_id = fm.familia_id
               and outro_admin.usuario_id <> v_usuario_id
               and outro_admin.status = 'ativo'
               and outro_admin.papel = 'administrador'
       );

    if v_familias_bloqueadas is not null then
        raise exception using
            errcode = 'P0001',
            message = 'Antes de excluir sua conta, promova outro administrador em: ' || v_familias_bloqueadas || '.';
    end if;

    select count(*)::integer
      into v_familias_count
      from public.familia_membros fm
     where fm.usuario_id = v_usuario_id
       and fm.status = 'ativo';

    select count(*)::integer
      into v_familias_exclusivas_count
      from public.familia_membros fm
     where fm.usuario_id = v_usuario_id
       and fm.status = 'ativo'
       and not exists (
            select 1
              from public.familia_membros outro
             where outro.familia_id = fm.familia_id
               and outro.usuario_id <> v_usuario_id
               and outro.status = 'ativo'
       );

    return jsonb_build_object(
        'pode_excluir', true,
        'usuario_id', v_usuario_id,
        'email', v_email,
        'familias_count', v_familias_count,
        'familias_exclusivas_count', v_familias_exclusivas_count
    );
end;
$$;

-- Exclusão da família atual: somente quando ela já está vazia de outros membros
-- e o usuário possui outra família para continuar usando a conta.
create or replace function public.excluir_familia_atual(
    p_nome_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_familia_nome text;
    v_papel text;
    v_membros_count integer := 0;
    v_proxima_familia_id uuid;
    v_proxima_familia_nome text;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login novamente para excluir a família.';
    end if;

    select p.familia_atual_id, f.nome, fm.papel
      into v_familia_id, v_familia_nome, v_papel
      from public.perfis p
      join public.familias f on f.id = p.familia_atual_id
      join public.familia_membros fm
        on fm.familia_id = p.familia_atual_id
       and fm.usuario_id = p.id
       and fm.status = 'ativo'
     where p.id = v_usuario_id
     limit 1;

    if v_familia_id is null then
        raise exception using
            errcode = 'P0002',
            message = 'Família atual não encontrada.';
    end if;

    if v_papel <> 'administrador' then
        raise exception using
            errcode = '42501',
            message = 'Apenas administradores podem excluir uma família.';
    end if;

    if lower(trim(coalesce(p_nome_confirmacao, ''))) <> lower(trim(v_familia_nome)) then
        raise exception using
            errcode = '22023',
            message = 'Digite exatamente o nome da família para confirmar a exclusão.';
    end if;

    select count(*)::integer
      into v_membros_count
      from public.familia_membros fm
     where fm.familia_id = v_familia_id
       and fm.status = 'ativo';

    if v_membros_count > 1 then
        raise exception using
            errcode = 'P0001',
            message = 'Remova os outros membros antes de excluir esta família.';
    end if;

    select fm.familia_id, f.nome
      into v_proxima_familia_id, v_proxima_familia_nome
      from public.familia_membros fm
      join public.familias f on f.id = fm.familia_id
     where fm.usuario_id = v_usuario_id
       and fm.status = 'ativo'
       and fm.familia_id <> v_familia_id
     order by
       case when fm.papel = 'administrador' then 0 else 1 end,
       fm.criado_em asc
     limit 1;

    if v_proxima_familia_id is null then
        raise exception using
            errcode = 'P0001',
            message = 'Esta é sua única família. Para apagar tudo, use a opção Excluir minha conta.';
    end if;

    update public.perfis
       set familia_atual_id = v_proxima_familia_id,
           atualizado_em = now()
     where id = v_usuario_id;

    delete from public.familias
     where id = v_familia_id;

    return jsonb_build_object(
        'mensagem', 'Família excluída com sucesso.',
        'familia_excluida_id', v_familia_id,
        'proxima_familia_id', v_proxima_familia_id,
        'proxima_familia_nome', v_proxima_familia_nome
    );
end;
$$;

revoke all on function public.obter_onboarding_beta() from public, anon;
grant execute on function public.obter_onboarding_beta() to authenticated;

revoke all on function public.concluir_onboarding_beta() from public, anon;
grant execute on function public.concluir_onboarding_beta() to authenticated;

revoke all on function public.registrar_visualizacao_privacidade() from public, anon;
grant execute on function public.registrar_visualizacao_privacidade() to authenticated;

revoke all on function public.preparar_exclusao_minha_conta(text) from public, anon;
grant execute on function public.preparar_exclusao_minha_conta(text) to authenticated;

revoke all on function public.excluir_familia_atual(text) from public, anon;
grant execute on function public.excluir_familia_atual(text) to authenticated;

commit;
