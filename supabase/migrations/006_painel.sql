-- =====================================================================
-- HelpMe — 006: painel de indicadores do administrador (US-017)
-- Requisitos: FR16, NFR09. Decisões D6 e D7.
--
-- O QUE FAZ:
--   painel_admin(): devolve, numa única chamada, SÓ TOTAIS (NFR09). Nenhum
--   id, nome, e-mail ou telefone de usuário sai daqui. Os únicos nomes são
--   de categorias (dado público do catálogo).
--
--   usuarios       clientes, profissionais (e quantos ainda sem perfil),
--                  administradores
--   profissionais  por status (pendente, aprovado, recusado)
--   fila           tamanho, quantos por resultado da última triagem,
--                  espera média de quem está na fila agora e tempo médio
--                  até a decisão nos últimos 30 dias
--   contratacoes   criadas nos últimos 7 e 30 dias, pelo status atual
--   taxa_aceite_30d aceitas ÷ respondidas (contratações criadas em 30 dias;
--                  aceita = aceita ou concluída; respondida = aceita,
--                  recusada ou concluída)
--   categorias     ativas e as ativas sem nenhum profissional aprovado
--
-- Tempos em horas (numeric, 1 casa). null = ainda sem dados.
-- Depende da 004 (analises_profissional, exigir_admin) e da 005
-- (categorias.ativa).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 005. Não altera dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- =====================================================================

create or replace function public.painel_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
    perform public.exigir_admin();

    return jsonb_build_object(
        'gerado_em', now(),

        'usuarios', (
            select jsonb_build_object(
                'clientes', count(*) filter (where u.tipo_usuario = 'cliente'
                                             and not exists (select 1 from public.administradores a
                                                             where a.usuario_id = u.id)),
                'profissionais', count(*) filter (where u.tipo_usuario = 'profissional'),
                'profissionais_sem_perfil', count(*) filter (where u.tipo_usuario = 'profissional'
                                                             and not exists (select 1 from public.profissionais p
                                                                             where p.id = u.id)),
                'administradores', (select count(*) from public.administradores))
            from public.usuarios u),

        'profissionais', (
            select jsonb_build_object(
                'pendente', count(*) filter (where p.status_aprovacao = 'pendente'),
                'aprovado', count(*) filter (where p.status_aprovacao = 'aprovado'),
                'recusado', count(*) filter (where p.status_aprovacao = 'recusado'))
            from public.profissionais p),

        -- Fila: início = último reenvio (US-013) ou o cadastro, como em fila_analise().
        'fila', (
            with fila as (
                select p.id,
                       coalesce((select max(a.created_at) from public.analises_profissional a
                                 where a.profissional_id = p.id and a.acao = 'reenvio'), p.created_at) as inicio,
                       (select a.resultado from public.analises_profissional a
                        where a.profissional_id = p.id and a.acao = 'triagem'
                        order by a.created_at desc, a.id desc limit 1) as triagem
                from public.profissionais p
                where p.status_aprovacao = 'pendente'
            ), decisoes as (
                select d.created_at
                       - coalesce((select max(r.created_at) from public.analises_profissional r
                                   where r.profissional_id = d.profissional_id and r.acao = 'reenvio'
                                     and r.created_at <= d.created_at),
                                  p.created_at) as duracao
                from public.analises_profissional d
                join public.profissionais p on p.id = d.profissional_id
                where d.acao in ('aprovacao', 'recusa')
                  and d.created_at >= now() - interval '30 days'
            )
            select jsonb_build_object(
                'tamanho', (select count(*) from fila),
                'verde', (select count(*) from fila where triagem = 'verde'),
                'pendencia', (select count(*) from fila where triagem = 'pendencia'),
                'suspeito', (select count(*) from fila where triagem = 'suspeito'),
                'sem_triagem', (select count(*) from fila where triagem is null),
                'espera_media_horas', (select round((avg(extract(epoch from now() - inicio)) / 3600)::numeric, 1) from fila),
                'decisoes_30d', (select count(*) from decisoes),
                'decisao_media_horas_30d', (select round((avg(extract(epoch from duracao)) / 3600)::numeric, 1) from decisoes))),

        'contratacoes', (
            select jsonb_object_agg(periodo, totais)
            from (
                select dias::text || 'd' as periodo,
                       jsonb_build_object(
                           'solicitada', count(c.id) filter (where c.status = 'solicitada'),
                           'aceita',     count(c.id) filter (where c.status = 'aceita'),
                           'recusada',   count(c.id) filter (where c.status = 'recusada'),
                           'cancelada',  count(c.id) filter (where c.status = 'cancelada'),
                           'concluida',  count(c.id) filter (where c.status = 'concluida'),
                           'total',      count(c.id)) as totais
                from (values (7), (30)) as per(dias)
                left join public.contratacoes c on c.created_at >= now() - make_interval(days => per.dias)
                group by dias
            ) t),

        'taxa_aceite_30d', (
            select jsonb_build_object(
                'aceitas', count(*) filter (where c.status in ('aceita', 'concluida')),
                'respondidas', count(*) filter (where c.status in ('aceita', 'recusada', 'concluida')),
                'percentual', case when count(*) filter (where c.status in ('aceita', 'recusada', 'concluida')) = 0
                                   then null
                                   else round(100.0 * count(*) filter (where c.status in ('aceita', 'concluida'))
                                              / count(*) filter (where c.status in ('aceita', 'recusada', 'concluida'))) end)
            from public.contratacoes c
            where c.created_at >= now() - interval '30 days'),

        'categorias', (
            select jsonb_build_object(
                'ativas', count(*),
                'sem_aprovado', coalesce(jsonb_agg(c.nome order by c.nome) filter (
                    where not exists (select 1 from public.profissional_categoria pc
                                      join public.profissionais p on p.id = pc.profissional_id
                                      where pc.categoria_id = c.id and p.status_aprovacao = 'aprovado')),
                    '[]'::jsonb))
            from public.categorias c
            where c.ativa)
    );
end;
$$;

revoke execute on function public.painel_admin() from public, anon;
grant  execute on function public.painel_admin() to authenticated;


-- Autoconferência -------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'painel_admin'
                     and p.prosecdef and p.proconfig @> array['search_path=public']) then
        raise exception '006: painel_admin() precisa ser security definer com search_path fixo';
    end if;

    if has_function_privilege('anon', 'public.painel_admin()', 'EXECUTE') then
        raise exception '006: visitante não pode chamar painel_admin()';
    end if;

    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'categorias' and column_name = 'ativa') then
        raise exception '006: aplique a 005_triagem.sql antes (categorias.ativa)';
    end if;
end;
$$;
