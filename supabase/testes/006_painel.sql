-- TESTE 006_painel.sql — US-017 (critérios 2, 3 e 5 no banco; NFR09, NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/006_painel.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof3@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v        jsonb;
    v_esp    jsonb;
    r        text := '';
begin
    if v_admin is null or v_cli is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof3@)';
    end if;

    -- ============ Critério 3: só admin ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.painel_admin();
        r := r || 'P1 FALHOU (cliente leu o painel)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P1 ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.painel_admin();
        r := r || 'P2 FALHOU (profissional leu o painel)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P2 ok (profissional recusado)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform public.painel_admin();
        r := r || 'P3 FALHOU (visitante leu o painel)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P3 ok (visitante sem execute)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 2: números batem com a contagem direta ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v := public.painel_admin();
    execute 'reset role';

    v_esp := jsonb_build_object(
        'clientes', (select count(*) from public.usuarios u where u.tipo_usuario = 'cliente'
                       and u.id not in (select usuario_id from public.administradores)),
        'profissionais', (select count(*) from public.usuarios where tipo_usuario = 'profissional'),
        'administradores', (select count(*) from public.administradores));
    r := r || case when (v -> 'usuarios') @> v_esp then 'P4 ok (usuários por tipo: ' || (v -> 'usuarios')::text || ')'
                   else 'P4 FALHOU (' || (v -> 'usuarios')::text || ' esperado ' || v_esp::text || ')' end || E'\n';

    v_esp := jsonb_build_object(
        'pendente', (select count(*) from public.profissionais where status_aprovacao = 'pendente'),
        'aprovado', (select count(*) from public.profissionais where status_aprovacao = 'aprovado'),
        'recusado', (select count(*) from public.profissionais where status_aprovacao = 'recusado'));
    r := r || case when v -> 'profissionais' = v_esp then 'P5 ok (profissionais por status: ' || v_esp::text || ')'
                   else 'P5 FALHOU (' || (v -> 'profissionais')::text || ' esperado ' || v_esp::text || ')' end || E'\n';

    r := r || case when (v -> 'fila' ->> 'tamanho')::int = (v_esp ->> 'pendente')::int
                    and (v -> 'fila' ->> 'tamanho')::int = (v -> 'fila' ->> 'verde')::int + (v -> 'fila' ->> 'pendencia')::int
                                                          + (v -> 'fila' ->> 'suspeito')::int + (v -> 'fila' ->> 'sem_triagem')::int
                   then 'P6 ok (fila = pendentes e soma das triagens)' else 'P6 FALHOU (' || (v -> 'fila')::text || ')' end || E'\n';

    v_esp := jsonb_build_object(
        'total', (select count(*) from public.contratacoes where created_at >= now() - interval '30 days'),
        'aceita', (select count(*) from public.contratacoes where created_at >= now() - interval '30 days' and status = 'aceita'));
    r := r || case when (v -> 'contratacoes' -> '30d') @> v_esp
                    and (v -> 'contratacoes' -> '7d' ->> 'total')::int
                        = (select count(*) from public.contratacoes where created_at >= now() - interval '7 days')
                   then 'P7 ok (contratações 7d/30d: ' || (v -> 'contratacoes')::text || ')'
                   else 'P7 FALHOU (' || (v -> 'contratacoes')::text || ')' end || E'\n';

    r := r || case when (v -> 'categorias' ->> 'ativas')::int = (select count(*) from public.categorias where ativa)
                    and jsonb_array_length(v -> 'categorias' -> 'sem_aprovado')
                        = (select count(*) from public.categorias c where c.ativa and not exists (
                              select 1 from public.profissional_categoria pc join public.profissionais p on p.id = pc.profissional_id
                              where pc.categoria_id = c.id and p.status_aprovacao = 'aprovado'))
                   then 'P8 ok (categorias sem aprovado: ' || (v -> 'categorias' -> 'sem_aprovado')::text || ')'
                   else 'P8 FALHOU (' || (v -> 'categorias')::text || ')' end || E'\n';

    -- NFR09: nada de id/e-mail/telefone de usuário
    r := r || case when v::text !~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}' and position('@' in v::text) = 0
                    and v::text !~ '\d{8,}'
                   then 'P9 ok (só totais: sem id, e-mail ou telefone)' else 'P9 FALHOU (' || v::text || ')' end || E'\n';

    -- ============ Taxa de aceite com dados conhecidos ============
    -- Sem contratações recentes: taxa null. Depois 3 aceitas/concluídas e 1 recusada: 75%.
    delete from public.contratacoes;
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v := public.painel_admin();
    execute 'reset role';
    r := r || case when v -> 'taxa_aceite_30d' -> 'percentual' = 'null'::jsonb
                    and (v -> 'contratacoes' -> '30d' ->> 'total')::int = 0
                    and (v -> 'contratacoes' -> '7d' ->> 'total')::int = 0
                   then 'P10 ok (sem contratações: zeros e taxa vazia)' else 'P10 FALHOU (' || v::text || ')' end || E'\n';

    -- Inserção como postgres (triggers de papel do app não se aplicam)
    alter table public.contratacoes disable trigger user;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status, created_at)
    select v_cli, p.id, 'teste painel', 'Rua teste', now() + interval '1 day', s.status, now() - s.idade
    from (select id from public.profissionais where status_aprovacao = 'aprovado' order by id limit 1) p,
         (values ('aceita', interval '1 day'), ('concluida', interval '2 days'), ('aceita', interval '10 days'),
                 ('recusada', interval '3 days'), ('cancelada', interval '1 day'), ('solicitada', interval '40 days')) as s(status, idade);
    alter table public.contratacoes enable trigger user;

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v := public.painel_admin();
    execute 'reset role';
    r := r || case when v -> 'taxa_aceite_30d' = '{"aceitas": 3, "respondidas": 4, "percentual": 75}'::jsonb
                   then 'P11 ok (taxa de aceite 3/4 = 75%)' else 'P11 FALHOU (' || (v -> 'taxa_aceite_30d')::text || ')' end || E'\n';
    r := r || case when (v -> 'contratacoes' -> '7d') = '{"solicitada": 0, "aceita": 1, "recusada": 1, "cancelada": 1, "concluida": 1, "total": 4}'::jsonb
                    and (v -> 'contratacoes' -> '30d' ->> 'total')::int = 5
                   then 'P12 ok (7d = 4, 30d = 5; a de 40 dias fica fora)' else 'P12 FALHOU (' || (v -> 'contratacoes')::text || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
