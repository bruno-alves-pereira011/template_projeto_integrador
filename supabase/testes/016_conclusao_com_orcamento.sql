-- TESTE 016_conclusao_com_orcamento.sql — US-023 (BR23, FR31)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/016_conclusao_com_orcamento.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: cliente@, prof1@ e prof2@helpme.test. Força o prof1 como aprovado.
-- Cria aqui dentro (e desfaz no final) contratações cliente → prof1 em vários status
-- e orçamentos aguardando/aprovados gravados direto (como postgres).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1  uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2  uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_a bigint;  -- solicitada: profissional aceita
    v_b bigint;  -- solicitada: profissional recusa
    v_c bigint;  -- solicitada: cliente cancela
    v_h bigint;  -- solicitada: transições proibidas
    v_d bigint;  -- aceita, sem orçamento
    v_e bigint;  -- aceita, orçamento aguardando
    v_f bigint;  -- aceita, orçamento aprovado (profissional conclui)
    v_g bigint;  -- aceita, orçamento aprovado (cliente conclui)
    v_orc_e bigint;
    v_n integer;
    v_n2 integer;
    v_st text;
    r text := '';
begin
    if v_cli is null or v_p1 is null or v_p2 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (cliente@, prof1@, prof2@)';
    end if;

    -- Preparação como postgres.
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 a', 'Rua do Teste, 16', now() + interval '2 days', 'solicitada') returning id into v_a;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 b', 'Rua do Teste, 16', now() + interval '2 days', 'solicitada') returning id into v_b;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 c', 'Rua do Teste, 16', now() + interval '2 days', 'solicitada') returning id into v_c;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 h', 'Rua do Teste, 16', now() + interval '2 days', 'solicitada') returning id into v_h;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 d', 'Rua do Teste, 16', now() + interval '2 days', 'aceita') returning id into v_d;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 e', 'Rua do Teste, 16', now() + interval '2 days', 'aceita') returning id into v_e;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 f', 'Rua do Teste, 16', now() + interval '2 days', 'aceita') returning id into v_f;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 016 g', 'Rua do Teste, 16', now() + interval '2 days', 'aceita') returning id into v_g;

    insert into public.orcamentos (contratacao_id, valor_centavos) values (v_e, 35000) returning id into v_orc_e;
    insert into public.orcamentos (contratacao_id, valor_centavos, situacao, respondido_em) values (v_f, 35000, 'aprovado', now());
    insert into public.orcamentos (contratacao_id, valor_centavos, situacao, respondido_em) values (v_g, 20000, 'aprovado', now());

    -- ============ Transições antigas continuam iguais (critério 5) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.contratacoes set status = 'aceita' where id = v_a;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C1 ok (profissional aceita solicitada)' else 'C1 FALHOU (' || v_n || ')' end || E'\n';
    update public.contratacoes set status = 'recusada' where id = v_b;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C2 ok (profissional recusa solicitada)' else 'C2 FALHOU (' || v_n || ')' end || E'\n';
    begin
        update public.contratacoes set status = 'cancelada' where id = v_h;
        r := r || 'C3 FALHOU (profissional cancelou solicitada)' || E'\n';
    exception when raise_exception then
        r := r || 'C3 ok (profissional não cancela solicitada: ' || sqlerrm || ')' || E'\n';
    end;
    begin
        update public.contratacoes set status = 'concluida' where id = v_h;
        r := r || 'C4 FALHOU (solicitada pulou para concluida)' || E'\n';
    exception when raise_exception then
        r := r || 'C4 ok (solicitada não vai direto para concluida)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.contratacoes set status = 'cancelada' where id = v_c;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C5 ok (cliente cancela solicitada)' else 'C5 FALHOU (' || v_n || ')' end || E'\n';
    begin
        update public.contratacoes set status = 'aceita' where id = v_h;
        r := r || 'C6 FALHOU (cliente aceitou a própria contratação)' || E'\n';
    exception when raise_exception then
        r := r || 'C6 ok (cliente não aceita)' || E'\n';
    end;
    begin
        update public.contratacoes set descricao = 'alterada' where id = v_h;
        r := r || 'C7 FALHOU (cliente alterou a descrição)' || E'\n';
    exception when raise_exception then
        r := r || 'C7 ok (só o status muda)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Aceita sem orçamento aprovado (critérios 2 e 4) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.contratacoes set status = 'concluida' where id = v_d;
        r := r || 'C8 FALHOU (cliente concluiu sem orçamento)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C8 ok (cliente não conclui sem valor aprovado: ' || sqlerrm || ')' || E'\n';
    end;
    begin
        update public.contratacoes set status = 'concluida' where id = v_e;
        r := r || 'C9 FALHOU (concluiu com valor só aguardando)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C9 ok (valor aguardando não basta para concluir)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.contratacoes set status = 'concluida' where id = v_d;
        r := r || 'C10 FALHOU (profissional concluiu sem orçamento)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C10 ok (profissional não conclui sem valor aprovado)' || E'\n';
    end;
    begin
        update public.contratacoes set status = 'cancelada' where id = v_d;
        r := r || 'C11 FALHOU (profissional cancelou contratação aceita)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'C11 ok (profissional não cancela aceita: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.contratacoes set status = 'cancelada' where id = v_d;
    get diagnostics v_n = row_count;
    update public.contratacoes set status = 'concluida' where id = v_f;
    get diagnostics v_n2 = row_count;
    execute 'reset role';
    r := r || case when v_n = 0 and v_n2 = 0 then 'C12 ok (outro profissional não cancela nem conclui: 0 linhas)'
                   else 'C12 FALHOU (' || v_n || ', ' || v_n2 || ')' end || E'\n';

    -- ============ Cliente cancela antes de aprovar (critério 3) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.contratacoes set status = 'cancelada' where id = v_d;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C13 ok (cliente cancela aceita sem orçamento)' else 'C13 FALHOU (' || v_n || ')' end || E'\n';
    update public.contratacoes set status = 'cancelada' where id = v_e;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C14 ok (cliente cancela aceita com valor aguardando)' else 'C14 FALHOU (' || v_n || ')' end || E'\n';
    begin
        perform public.responder_orcamento(v_orc_e, true);
        r := r || 'C15 FALHOU (aprovou valor de contratação cancelada)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C15 ok (depois de cancelada, o valor não é mais aprovado)' || E'\n';
    end;
    begin
        update public.contratacoes set status = 'aceita' where id = v_d;
        r := r || 'C16 FALHOU (cancelada voltou para aceita)' || E'\n';
    exception when raise_exception then
        r := r || 'C16 ok (cancelada não volta)' || E'\n';
    end;

    -- ============ Com valor aprovado (critérios 2 e 4) ============
    begin
        update public.contratacoes set status = 'cancelada' where id = v_f;
        r := r || 'C17 FALHOU (cliente cancelou depois do valor aprovado)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C17 ok (cliente não cancela depois do valor aprovado: ' || sqlerrm || ')' || E'\n';
    end;
    update public.contratacoes set status = 'concluida' where id = v_g;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C18 ok (cliente conclui com valor aprovado)' else 'C18 FALHOU (' || v_n || ')' end || E'\n';
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.contratacoes set status = 'concluida' where id = v_f;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'C19 ok (profissional conclui com valor aprovado)' else 'C19 FALHOU (' || v_n || ')' end || E'\n';
    begin
        update public.contratacoes set status = 'cancelada' where id = v_f;
        r := r || 'C20 FALHOU (concluida foi cancelada)' || E'\n';
    exception when raise_exception then
        r := r || 'C20 ok (concluida não tem mais transição)' || E'\n';
    end;
    execute 'reset role';

    -- Visitante não muda nada.
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        update public.contratacoes set status = 'cancelada' where id = v_h;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 0 then 'C21 ok (visitante não altera: 0 linhas)' else 'C21 FALHOU (' || v_n || ')' end || E'\n';
    exception when insufficient_privilege or raise_exception then
        r := r || 'C21 ok (visitante não altera)' || E'\n';
    end;
    execute 'reset role';

    select string_agg(c.status, ',' order by c.descricao) into v_st
    from public.contratacoes c where c.id in (v_a, v_b, v_c, v_d, v_e, v_f, v_g, v_h);
    r := r || case when v_st = 'aceita,recusada,cancelada,cancelada,cancelada,concluida,concluida,solicitada'
                   then 'C22 ok (status finais conferem)' else 'C22 FALHOU (' || v_st || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
