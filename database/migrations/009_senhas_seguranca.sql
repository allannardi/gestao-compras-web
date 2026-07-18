begin;

create or replace function public.obter_email_redefinicao_membro(p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_familia_id uuid;
    v_nome text;
    v_email text;
begin
    if v_usuario_id is null then
        raise exception using errcode = '42501', message = 'Faça login para solicitar a redefinição de senha.';
    end if;

    select p.familia_atual_id
      into v_familia_id
      from public.perfis p
     where p.id = v_usuario_id;

    if v_familia_id is null or not private.usuario_admin_familia(v_familia_id) then
        raise exception using errcode = '42501', message = 'Apenas administradores podem solicitar a redefinição de senha de membros.';
    end if;

    if p_usuario_id = v_usuario_id then
        raise exception using errcode = '22023', message = 'Use a seção Minha senha para alterar a sua própria senha.';
    end if;

    select p.nome, lower(p.email)
      into v_nome, v_email
      from public.familia_membros fm
      join public.perfis p on p.id = fm.usuario_id
     where fm.familia_id = v_familia_id
       and fm.usuario_id = p_usuario_id
       and fm.status = 'ativo';

    if v_email is null then
        raise exception using errcode = 'P0002', message = 'Membro ativo não encontrado nesta família.';
    end if;

    return jsonb_build_object(
        'usuario_id', p_usuario_id,
        'nome', coalesce(v_nome, 'Membro'),
        'email', v_email
    );
end;
$$;

revoke all on function public.obter_email_redefinicao_membro(uuid) from public, anon;
grant execute on function public.obter_email_redefinicao_membro(uuid) to authenticated;

commit;
