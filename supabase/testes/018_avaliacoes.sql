-- TESTE 018_avaliacoes.sql — US-025 (FR33, FR34, BR27, BR28, BR29)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/018_avaliacoes.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: cliente@, prof1@, prof2@ e admin@helpme.test. Força o prof1 como aprovado
-- e apaga aqui dentro (desfeito no final) a avaliação do cliente para o prof1, se houver.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1  uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2  uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_adm uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_av  bigint;
    v_n   integer;
    v_nota smallint;
    v_com text;
    v_prof uuid;
    r text := '';
begin
    if v_cli is null or v_p1 is null or v_p2 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (cliente@, prof1@, prof2@)';
    end if;

    -- Preparação como postgres: o cliente só tem uma contratação CANCELADA com o prof1.
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
    delete from public.avaliacoes where usuario_id = v_cli and profissional_id = v_p1;
    delete from public.contratacoes where cliente_id = v_cli and profissional_id = v_p1 and status = 'concluida';
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 018 cancelada', 'Rua do Teste, 18', now() + interval '2 days', 'cancelada');

    -- ============ Sem contratação concluída: não avalia (BR27) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota) values (v_cli, v_p1, 5);
        r := r || 'A1 FALHOU (avaliou sem contratação concluída)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A1 ok (sem contratação concluída não avalia)' || E'\n';
    end;
    execute 'reset role';

    -- Agora duas contratações concluídas com o prof1.
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 018 concluida 1', 'Rua do Teste, 18', now() + interval '2 days', 'concluida'),
           (v_cli, v_p1, 'TESTE 018 concluida 2', 'Rua do Teste, 18', now() + interval '2 days', 'concluida');

    -- ============ Cliente com contratação concluída ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota, comentario)
        values (v_cli, v_p1, 5, 'TESTE 018 ótimo') returning id into v_av;
        r := r || 'A2 ok (avaliou depois de concluir)' || E'\n';
    exception when others then
        r := r || 'A2 FALHOU (' || sqlerrm || ')' || E'\n';
    end;

    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota) values (v_cli, v_p1, 3);
        r := r || 'A3 FALHOU (segunda avaliação para o mesmo profissional)' || E'\n';
    exception when unique_violation then
        r := r || 'A3 ok (duas concluídas, uma avaliação só)' || E'\n';
    end;

    update public.avaliacoes set nota = 4, comentario = 'TESTE 018 bom' where id = v_av;
    get diagnostics v_n = row_count;
    select nota, comentario into v_nota, v_com from public.avaliacoes where id = v_av;
    r := r || case when v_n = 1 and v_nota = 4 and v_com = 'TESTE 018 bom'
                   then 'A4 ok (editou nota e comentário)' else 'A4 FALHOU (' || v_n || ' ' || coalesce(v_nota::text, '-') || ')' end || E'\n';

    begin
        update public.avaliacoes set profissional_id = v_p2 where id = v_av;
        r := r || 'A5 FALHOU (mudou o profissional da avaliação)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A5 ok (não muda o profissional da avaliação)' || E'\n';
    end;

    begin
        update public.avaliacoes set created_at = '2000-01-01' where id = v_av;
        r := r || 'A6 FALHOU (forjou a data)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A6 ok (não muda a data)' || E'\n';
    end;

    begin
        delete from public.avaliacoes where id = v_av;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 0 then 'A7 ok (autor não apaga: 0 linhas)' else 'A7 FALHOU (apagou)' end || E'\n';
    exception when insufficient_privilege then
        r := r || 'A7 ok (autor não apaga)' || E'\n';
    end;

    begin
        update public.avaliacoes set nota = 6 where id = v_av;
        r := r || 'A8 FALHOU (nota 6 aceita)' || E'\n';
    exception when check_violation then
        r := r || 'A8 ok (nota fora de 1 a 5 recusada)' || E'\n';
    end;

    begin
        update public.avaliacoes set comentario = repeat('a', 501) where id = v_av;
        r := r || 'A9 FALHOU (comentário de 501 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'A9 ok (comentário acima de 500 recusado)' || E'\n';
    end;

    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota) values (v_p2, v_p1, 1);
        r := r || 'A10 FALHOU (avaliou em nome de outra pessoa)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A10 ok (não avalia em nome de outra pessoa)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Profissional e admin não mexem em avaliação alheia (BR28) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.avaliacoes set nota = 1 where id = v_av;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 0 then 'A11 ok (profissional avaliado não edita: 0 linhas)' else 'A11 FALHOU (' || v_n || ')' end || E'\n';
    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota) values (v_p1, v_p2, 5);
        r := r || 'A12 FALHOU (profissional avaliou outro sem ser cliente)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A12 ok (profissional não avalia sem contratação concluída como cliente)' || E'\n';
    end;
    execute 'reset role';

    if v_adm is not null then
        perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
        update public.avaliacoes set nota = 1 where id = v_av;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 0 then 'A13 ok (admin não edita avaliação: 0 linhas)' else 'A13 FALHOU (' || v_n || ')' end || E'\n';
        execute 'reset role';
    else
        r := r || 'A13 PULADO (admin@helpme.test não existe)' || E'\n';
    end if;

    -- ============ Visitante ============
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota) values (v_cli, v_p1, 5);
        r := r || 'A14 FALHOU (visitante avaliou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A14 ok (visitante não avalia)' || E'\n';
    end;
    select count(*) into v_n from public.avaliacoes where id = v_av;
    r := r || case when v_n = 1 then 'A15 ok (visitante continua lendo as avaliações)' else 'A15 FALHOU' end || E'\n';
    execute 'reset role';

    -- ============ BR29 e estado final ============
    select profissional_id, nota into v_prof, v_nota from public.avaliacoes where id = v_av;
    select count(*) into v_n from public.avaliacoes a
    where not exists (select 1 from public.contratacoes c where c.cliente_id = a.usuario_id
                        and c.profissional_id = a.profissional_id and c.status = 'concluida');
    r := r || case when v_n = 0 and v_prof = v_p1 and v_nota = 4
                   then 'A16 ok (toda avaliação tem contratação concluída; a do teste ficou nota 4, prof1)'
                   else 'A16 FALHOU (' || v_n || ' sem concluída)' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
