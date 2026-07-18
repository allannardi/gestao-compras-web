begin;

-- ============================================================
-- v1.0.0 — Beta controlado
-- Execute depois de 013_preparacao_beta_privacidade.sql.
-- ============================================================

create table if not exists public.aceites_legais (
    usuario_id uuid primary key references auth.users(id) on delete cascade,
    termos_versao text not null,
    privacidade_versao text not null,
    aceito_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

alter table public.aceites_legais enable row level security;

drop policy if exists aceites_legais_select_proprio
    on public.aceites_legais;

create policy aceites_legais_select_proprio
on public.aceites_legais for select
to authenticated
using (usuario_id = (select auth.uid()));

revoke all on public.aceites_legais from public, anon;
grant select on public.aceites_legais to authenticated;

create or replace function public.obter_status_aceite_legal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_termos_atual constant text := '1.0';
    v_privacidade_atual constant text := '1.0';
    v_termos_aceito text;
    v_privacidade_aceita text;
    v_aceito_em timestamptz;
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para consultar os documentos legais.';
    end if;

    select a.termos_versao, a.privacidade_versao, a.aceito_em
      into v_termos_aceito, v_privacidade_aceita, v_aceito_em
      from public.aceites_legais a
     where a.usuario_id = v_usuario_id
     limit 1;

    return jsonb_build_object(
        'aceito',
            coalesce(v_termos_aceito = v_termos_atual, false)
            and coalesce(v_privacidade_aceita = v_privacidade_atual, false),
        'termos_versao_atual', v_termos_atual,
        'privacidade_versao_atual', v_privacidade_atual,
        'termos_versao_aceita', v_termos_aceito,
        'privacidade_versao_aceita', v_privacidade_aceita,
        'aceito_em', v_aceito_em
    );
end;
$$;

create or replace function public.registrar_aceite_legal(
    p_termos_versao text,
    p_privacidade_versao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario_id uuid := auth.uid();
    v_termos_atual constant text := '1.0';
    v_privacidade_atual constant text := '1.0';
    v_aceito_em timestamptz := now();
begin
    if v_usuario_id is null then
        raise exception using
            errcode = '42501',
            message = 'Faça login para aceitar os documentos legais.';
    end if;

    if trim(coalesce(p_termos_versao, '')) <> v_termos_atual
       or trim(coalesce(p_privacidade_versao, '')) <> v_privacidade_atual then
        raise exception using
            errcode = '22023',
            message = 'A versão dos documentos mudou. Atualize a página e leia novamente.';
    end if;

    insert into public.aceites_legais (
        usuario_id,
        termos_versao,
        privacidade_versao,
        aceito_em,
        atualizado_em
    )
    values (
        v_usuario_id,
        v_termos_atual,
        v_privacidade_atual,
        v_aceito_em,
        v_aceito_em
    )
    on conflict (usuario_id) do update
       set termos_versao = excluded.termos_versao,
           privacidade_versao = excluded.privacidade_versao,
           aceito_em = excluded.aceito_em,
           atualizado_em = excluded.atualizado_em;

    return jsonb_build_object(
        'mensagem', 'Termos e aviso de privacidade aceitos.',
        'termos_versao', v_termos_atual,
        'privacidade_versao', v_privacidade_atual,
        'aceito_em', v_aceito_em
    );
end;
$$;

revoke all on function public.obter_status_aceite_legal()
    from public, anon;
revoke all on function public.registrar_aceite_legal(text, text)
    from public, anon;

grant execute on function public.obter_status_aceite_legal()
    to authenticated;
grant execute on function public.registrar_aceite_legal(text, text)
    to authenticated;

commit;
