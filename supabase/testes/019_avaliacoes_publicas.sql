-- TESTE 019_avaliacoes_publicas.sql — US-026 (FR35, NFR15)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/019_avaliacoes_publicas.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: cliente@, prof1@ e prof2@helpme.test. Aqui dentro (desfeito no final): força o
-- prof1 como aprovado, troca nomes e grava avaliações direto como postgres (sem passar pelas regras da 018).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1  uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2  uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_n   integer;
    v_txt text;
    v_chaves text;
    r text := '';
begin
    if v_cli is null or v_p1 is null or v_p2 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (cliente@, prof1@, prof2@)';
    end if;

    -- Preparação como postgres: duas avaliações do prof1, a do cliente mais nova.
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
    update public.usuarios set nome = '  Ana   Paula Rocha' where id = v_cli;
    update public.usuarios set nome = E'\tJoão\tda Silva' where id = v_p2;
    delete from public.avaliacoes where profissional_id = v_p1;
    insert into public.avaliacoes (usuario_id, profissional_id, nota, comentario, created_at) values
        (v_p2,  v_p1, 3, null,                         now() - interval '2 days'),
        (v_cli, v_p1, 5, '<b>Ótimo</b> serviço',       now() - interval '1 day');

    -- ============ Visitante ============
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';

    select string_agg(autor || ':' || nota, ',' order by criada_em desc) into v_txt
    from public.avaliacoes_do_profissional(v_p1);
    r := r || case when v_txt = 'Ana:5,João:3' then 'P1 ok (visitante lê, mais recentes primeiro, só o primeiro nome)'
                   else 'P1 FALHOU (' || coalesce(v_txt, 'nada') || ')' end || E'\n';

    select string_agg(k, ',' order by k) into v_chaves
    from (select to_jsonb(t) j from public.avaliacoes_do_profissional(v_p1) t limit 1) x, jsonb_object_keys(x.j) k;
    r := r || case when v_chaves = 'autor,comentario,criada_em,nota' then 'P2 ok (só nota, comentário, autor e data)'
                   else 'P2 FALHOU (' || coalesce(v_chaves, 'nada') || ')' end || E'\n';

    select count(*) into v_n from public.avaliacoes_do_profissional(v_p1)
    where autor like '% %' or autor ilike '%Rocha%' or autor ilike '%Silva%';
    r := r || case when v_n = 0 then 'P3 ok (sem sobrenome)' else 'P3 FALHOU (' || v_n || ')' end || E'\n';

    select count(*) into v_n from public.avaliacoes_do_profissional(v_p1) where nota = 3 and comentario is null;
    r := r || case when v_n = 1 then 'P4 ok (comentário vazio volta null)' else 'P4 FALHOU' end || E'\n';

    select comentario into v_txt from public.avaliacoes_do_profissional(v_p1) where nota = 5;
    r := r || case when v_txt = '<b>Ótimo</b> serviço' then 'P5 ok (comentário volta como foi gravado; a tela mostra como texto)'
                   else 'P5 FALHOU (' || coalesce(v_txt, 'null') || ')' end || E'\n';

    select count(*) into v_n from public.avaliacoes_do_profissional(null);
    r := r || case when v_n = 0 then 'P6 ok (id vazio: nada)' else 'P6 FALHOU' end || E'\n';

    begin
        select count(*) into v_n from public.usuarios where id = v_cli;
        r := r || case when v_n = 0 then 'P7 ok (visitante continua sem ler o cliente em usuarios)' else 'P7 FALHOU (leu)' end || E'\n';
    exception when insufficient_privilege then
        r := r || 'P7 ok (visitante continua sem ler o cliente em usuarios)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Profissional não aprovado: nada ============
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p1;
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    select count(*) into v_n from public.avaliacoes_do_profissional(v_p1);
    r := r || case when v_n = 0 then 'P8 ok (profissional não aprovado: nenhuma avaliação)' else 'P8 FALHOU (' || v_n || ')' end || E'\n';
    execute 'reset role';
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;

    -- ============ Logado e nome vazio ============
    update public.usuarios set nome = '   ' where id = v_p2;
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select string_agg(autor, ',' order by criada_em desc) into v_txt from public.avaliacoes_do_profissional(v_p1);
    r := r || case when v_txt = 'Ana,Cliente' then 'P9 ok (logado também lê; nome vazio vira "Cliente")'
                   else 'P9 FALHOU (' || coalesce(v_txt, 'nada') || ')' end || E'\n';
    execute 'reset role';

    r := r || case when position('limit 20' in pg_get_functiondef('public.avaliacoes_do_profissional(uuid)'::regprocedure)) > 0
                   then 'P10 ok (no máximo 20)' else 'P10 FALHOU (sem limite de 20)' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
