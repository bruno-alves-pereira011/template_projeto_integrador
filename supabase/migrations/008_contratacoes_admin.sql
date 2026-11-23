-- =====================================================================
-- HelpMe — 008: consulta de contratações pelo administrador (US-020)
-- Requisitos: FR26, BR21. Decisões D6 e D7.
--
-- O QUE FAZ:
--   contratacoes_admin(status, dias, busca, profissional_id, limite,
--   deslocamento): lista SOMENTE LEITURA das contratações, mais recentes
--   primeiro, com o total encontrado (para "Carregar mais").
--
-- O QUE DEVOLVE (decisão do PO, Review & Adjust de 2026-11-23):
--   id, criada_em, data_desejada, status, atualizada_em, nome do cliente,
--   id e nome do profissional. NÃO devolve endereço, telefone, descrição
--   do serviço nem nada de mensagens (BR21: admin não lê o chat).
--
-- POR QUE FUNÇÃO E NÃO POLÍTICA? Uma política de SELECT em contratacoes
-- liberaria a linha inteira (endereço e descrição). Nenhuma política nova
-- é criada em contratacoes nem em mensagens.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 004 (usa exigir_admin).
-- Não altera dados e pode ser rodado de novo. No final ele se confere.
-- =====================================================================

create or replace function public.contratacoes_admin(
    p_status           text    default null,
    p_dias             integer default null,
    p_busca            text    default null,
    p_profissional_id  uuid    default null,
    p_limite           integer default 50,
    p_deslocamento     integer default 0
)
returns table (
    id                 bigint,
    criada_em          timestamptz,
    data_desejada      timestamptz,
    status             text,
    atualizada_em      timestamptz,
    cliente_nome       text,
    profissional_id    uuid,
    profissional_nome  text,
    total              bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
begin
    perform public.exigir_admin();

    if p_status is not null and p_status not in ('solicitada', 'aceita', 'recusada', 'cancelada', 'concluida') then
        raise exception 'Status inválido: %', p_status using errcode = '22023';
    end if;
    if p_dias is not null and p_dias not in (7, 30, 90) then
        raise exception 'Período inválido: use 7, 30 ou 90 dias' using errcode = '22023';
    end if;
    if p_limite is null or p_limite < 1 or p_limite > 100 or p_deslocamento is null or p_deslocamento < 0 then
        raise exception 'Paginação inválida' using errcode = '22023';
    end if;

    -- % e _ digitados viram texto, não curinga.
    if v_busca is not null then
        v_busca := '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    end if;

    return query
    select c.id,
           c.created_at,
           c.data_desejada,
           c.status,
           c.updated_at,
           uc.nome,
           c.profissional_id,
           up.nome,
           count(*) over ()
    from public.contratacoes c
    join public.usuarios uc on uc.id = c.cliente_id
    join public.usuarios up on up.id = c.profissional_id
    where (p_status is null or c.status = p_status)
      and (p_dias is null or c.created_at >= now() - make_interval(days => p_dias))
      and (p_profissional_id is null or c.profissional_id = p_profissional_id)
      and (v_busca is null or uc.nome ilike v_busca or up.nome ilike v_busca)
    order by c.created_at desc, c.id desc
    limit p_limite offset p_deslocamento;
end;
$$;

revoke execute on function public.contratacoes_admin(text, integer, text, uuid, integer, integer) from public, anon;
grant  execute on function public.contratacoes_admin(text, integer, text, uuid, integer, integer) to authenticated;


-- Autoconferência ---------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'contratacoes_admin'
                     and p.prosecdef and p.proconfig @> array['search_path=public']) then
        raise exception '008: contratacoes_admin() precisa ser security definer com search_path fixo';
    end if;

    if has_function_privilege('anon', 'public.contratacoes_admin(text, integer, text, uuid, integer, integer)', 'EXECUTE') then
        raise exception '008: visitante não pode chamar contratacoes_admin()';
    end if;

    -- BR21: nenhuma política que dê ao admin acesso direto a contratações ou mensagens.
    if exists (select 1 from pg_policies
               where schemaname = 'public' and tablename in ('contratacoes', 'mensagens')
                 and (qual ilike '%eh_admin%' or with_check ilike '%eh_admin%')) then
        raise exception '008: contratacoes/mensagens não podem ter política de admin (BR21)';
    end if;
end;
$$;
