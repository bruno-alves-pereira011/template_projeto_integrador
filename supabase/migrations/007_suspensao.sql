-- =====================================================================
-- HelpMe — 007: suspender e reativar profissional aprovado (US-019)
-- Requisitos: FR25, BR11, BR19, NFR10. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. status_aprovacao ganha 'suspenso'. Todas as regras do 001 testam
--      status_aprovacao = 'aprovado' (diretório, perfil público, contratar,
--      aceitar, avaliar), então o suspenso sai de tudo isso sem mexer nelas.
--      Contratações já aceitas continuam e o cliente pode concluir (BR06).
--   2. analises_profissional.acao ganha 'suspensao' e 'reativacao'.
--      Suspensão exige motivo de 10 a 500 caracteres; reativação aceita
--      motivo opcional de até 500.
--   3. profissionais_admin(status, busca, limite, deslocamento): lista de
--      profissionais para o admin (só as colunas que a tela usa).
--   4. alterar_suspensao(id, acao, motivo): 'suspender' (aprovado ->
--      suspenso) ou 'reativar' (suspenso -> aprovado). Confere o status no
--      momento da ação, trava a linha e grava o histórico (BR19, NFR10).
--      O admin não altera o próprio cadastro.
--   5. minha_ultima_decisao(): o profissional lê a última decisão sobre o
--      PRÓPRIO cadastro (acao, motivo, data), para a tela de bloqueio.
--   6. painel_admin(): passa a contar os suspensos (cópia da 006 com uma
--      linha a mais).
--
-- Decisões do PO (Review & Adjust, 2026-11-23): o suspenso não usa o app
-- (vê bloqueio.html com o motivo); solicitações ainda sem resposta ficam
-- como estão (o cliente pode cancelar); reativar volta direto a aprovado.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 006. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- =====================================================================

do $$
begin
    if to_regprocedure('public.painel_admin()') is null or to_regprocedure('public.solicitar_analise()') is null then
        raise exception '007: aplique antes a 005_triagem.sql e a 006_painel.sql';
    end if;
end;
$$;


-- 1. Status 'suspenso' ----------------------------------------------------------
-- O check do 001 foi criado sem nome fixo: procura pelo texto da regra.
do $$
declare
    v_nome text;
begin
    for v_nome in
        select conname from pg_constraint
        where conrelid = 'public.profissionais'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status_aprovacao = ANY (ARRAY[%'
    loop
        execute format('alter table public.profissionais drop constraint %I', v_nome);
    end loop;
end;
$$;

alter table public.profissionais
    add constraint profissionais_status_aprovacao_check
    check (status_aprovacao in ('pendente', 'aprovado', 'recusado', 'suspenso'));


-- 2. Histórico: suspensão e reativação -------------------------------------------
do $$
declare
    v_nome text;
begin
    for v_nome in
        select conname from pg_constraint
        where conrelid = 'public.analises_profissional'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%acao = ANY (ARRAY[%'
    loop
        execute format('alter table public.analises_profissional drop constraint %I', v_nome);
    end loop;
end;
$$;

alter table public.analises_profissional
    add constraint analises_profissional_acao_check
    check (acao in ('triagem', 'aprovacao', 'recusa', 'reenvio', 'suspensao', 'reativacao'));

alter table public.analises_profissional drop constraint if exists analises_motivo_da_suspensao;
alter table public.analises_profissional
    add constraint analises_motivo_da_suspensao
    check (acao <> 'suspensao' or char_length(trim(coalesce(motivo, ''))) between 10 and 500);

alter table public.analises_profissional drop constraint if exists analises_motivo_da_reativacao;
alter table public.analises_profissional
    add constraint analises_motivo_da_reativacao
    check (acao <> 'reativacao' or motivo is null or char_length(motivo) <= 500);


-- 3. Lista de profissionais para o admin -----------------------------------------
-- p_status null = todos. p_busca: parte do nome, sem diferenciar maiúsculas.
-- total = quantos atendem ao filtro (para "Carregar mais").
create or replace function public.profissionais_admin(
    p_status        text    default null,
    p_busca         text    default null,
    p_limite        integer default 50,
    p_deslocamento  integer default 0
)
returns table (
    id             uuid,
    nome           text,
    cidade         text,
    bairro         text,
    categorias     text[],
    status         text,
    cadastrado_em  timestamptz,
    total          bigint
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

    if p_status is not null and p_status not in ('pendente', 'aprovado', 'recusado', 'suspenso') then
        raise exception 'Status inválido: %', p_status using errcode = '22023';
    end if;
    if p_limite is null or p_limite < 1 or p_limite > 100 or p_deslocamento is null or p_deslocamento < 0 then
        raise exception 'Paginação inválida' using errcode = '22023';
    end if;

    -- % e _ digitados viram texto, não curinga.
    if v_busca is not null then
        v_busca := '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    end if;

    return query
    select p.id,
           u.nome,
           p.cidade,
           p.bairro,
           coalesce((select array_agg(c.nome order by c.nome)
                     from public.profissional_categoria pc
                     join public.categorias c on c.id = pc.categoria_id
                     where pc.profissional_id = p.id), '{}'),
           p.status_aprovacao,
           p.created_at,
           count(*) over ()
    from public.profissionais p
    join public.usuarios u on u.id = p.id
    where (p_status is null or p.status_aprovacao = p_status)
      and (v_busca is null or u.nome ilike v_busca)
    order by lower(u.nome), p.id
    limit p_limite offset p_deslocamento;
end;
$$;


-- 4. Suspender / reativar ----------------------------------------------------------
-- Devolve uma linha: situacao 'suspenso' | 'aprovado' (feito) ou 'ignorado'
-- (status já mudou, outro admin agiu antes, ou é o próprio cadastro).
create or replace function public.alterar_suspensao(
    p_id      uuid,
    p_acao    text,
    p_motivo  text default null
)
returns table (
    profissional_id  uuid,
    situacao         text,
    detalhe          text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_admin   uuid := (select auth.uid());
    v_motivo  text := nullif(trim(coalesce(p_motivo, '')), '');
    v_status  text;
begin
    perform public.exigir_admin();

    if p_acao not in ('suspender', 'reativar') then
        raise exception 'Ação inválida: use suspender ou reativar' using errcode = '22023';
    end if;
    if p_acao = 'suspender' and char_length(coalesce(v_motivo, '')) not between 10 and 500 then
        raise exception 'O motivo da suspensão precisa ter de 10 a 500 caracteres' using errcode = '22023';
    end if;
    if p_acao = 'reativar' and char_length(coalesce(v_motivo, '')) > 500 then
        raise exception 'O motivo da reativação pode ter no máximo 500 caracteres' using errcode = '22023';
    end if;

    profissional_id := p_id;

    if p_id = v_admin then
        situacao := 'ignorado';
        detalhe := 'Um administrador não altera o próprio cadastro';
        return next;
        return;
    end if;

    -- Trava a linha: dois admins ao mesmo tempo -> só o primeiro muda.
    select p.status_aprovacao into v_status
    from public.profissionais p where p.id = p_id
    for update;

    if not found then
        raise exception 'Profissional não encontrado' using errcode = '22023';
    end if;

    if p_acao = 'suspender' and v_status <> 'aprovado' then
        situacao := 'ignorado';
        detalhe := 'Só profissional aprovado pode ser suspenso (status atual: ' || v_status || ')';
        return next;
        return;
    end if;
    if p_acao = 'reativar' and v_status <> 'suspenso' then
        situacao := 'ignorado';
        detalhe := 'Só profissional suspenso pode ser reativado (status atual: ' || v_status || ')';
        return next;
        return;
    end if;

    update public.profissionais
       set status_aprovacao = case when p_acao = 'suspender' then 'suspenso' else 'aprovado' end
     where id = p_id;

    insert into public.analises_profissional (profissional_id, acao, autor_id, motivo)
    values (p_id, case when p_acao = 'suspender' then 'suspensao' else 'reativacao' end, v_admin, v_motivo);

    situacao := case when p_acao = 'suspender' then 'suspenso' else 'aprovado' end;
    detalhe := null;
    return next;
end;
$$;


-- 5. Última decisão sobre o próprio cadastro -------------------------------------------
-- Para bloqueio.html: { acao, motivo, em } ou null. Só decisões de admin
-- (aprovação, recusa, suspensão, reativação); triagem fica de fora.
create or replace function public.minha_ultima_decisao()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object('acao', a.acao, 'motivo', a.motivo, 'em', a.created_at)
    from public.analises_profissional a
    where a.profissional_id = (select auth.uid())
      and a.acao in ('aprovacao', 'recusa', 'suspensao', 'reativacao')
    order by a.created_at desc, a.id desc
    limit 1;
$$;

revoke execute on function public.profissionais_admin(text, text, integer, integer) from public, anon;
revoke execute on function public.alterar_suspensao(uuid, text, text)               from public, anon;
revoke execute on function public.minha_ultima_decisao()                            from public, anon;
grant  execute on function public.profissionais_admin(text, text, integer, integer) to authenticated;
grant  execute on function public.alterar_suspensao(uuid, text, text)               to authenticated;
grant  execute on function public.minha_ultima_decisao()                            to authenticated;


-- 6. Painel com suspensos (igual à 006, com 'suspenso' em profissionais) ----------------
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
                'recusado', count(*) filter (where p.status_aprovacao = 'recusado'),
                'suspenso', count(*) filter (where p.status_aprovacao = 'suspenso'))
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


-- 7. Autoconferência ---------------------------------------------------------------------
do $$
declare
    v_funcao text;
begin
    if not exists (select 1 from pg_constraint
                   where conrelid = 'public.profissionais'::regclass and contype = 'c'
                     and pg_get_constraintdef(oid) like '%suspenso%') then
        raise exception '007: status_aprovacao ainda não aceita suspenso';
    end if;

    if (select count(*) from pg_constraint
        where conrelid = 'public.profissionais'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status_aprovacao = ANY (ARRAY[%') <> 1 then
        raise exception '007: deveria haver um único check de status_aprovacao';
    end if;

    foreach v_funcao in array array['profissionais_admin', 'alterar_suspensao', 'minha_ultima_decisao', 'painel_admin'] loop
        if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'public' and p.proname = v_funcao
                         and p.prosecdef and p.proconfig @> array['search_path=public']) then
            raise exception '007: %() precisa ser security definer com search_path fixo', v_funcao;
        end if;
    end loop;

    if has_function_privilege('anon', 'public.alterar_suspensao(uuid, text, text)', 'EXECUTE')
       or has_function_privilege('anon', 'public.profissionais_admin(text, text, integer, integer)', 'EXECUTE')
       or has_function_privilege('anon', 'public.minha_ultima_decisao()', 'EXECUTE') then
        raise exception '007: visitante não pode chamar as funções da 007';
    end if;

    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'analises_profissional') then
        raise exception '007: analises_profissional não pode ter políticas';
    end if;
end;
$$;
