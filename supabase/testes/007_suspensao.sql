-- TESTE 007_suspensao.sql — US-019 (critérios 1, 3, 4, 5, 6, 7 e 8 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/007_suspensao.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof1@ (aprovado), prof3@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_nome1  text;
    v_n      integer;
    v_m      integer;
    v_texto  text;
    v_json   jsonb;
    v_linha  record;
    v_contr  bigint;
    r        text := '';
    c_motivo constant text := 'Reclamações repetidas de clientes sobre atrasos.';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof3@)';
    end if;

    -- Preparação como postgres: prof1 aprovado, prof3 pendente
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    select nome into v_nome1 from public.usuarios where id = v_p1;

    -- ============ Critério 8: só admin ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.profissionais_admin();
        r := r || 'S1 FALHOU (cliente listou profissionais)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'S1 ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.alterar_suspensao(v_p3, 'suspender', c_motivo);
        r := r || 'S2 FALHOU (profissional suspendeu alguém)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'S2 ok (profissional recusado)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform * from public.profissionais_admin();
        r := r || 'S3 FALHOU (visitante listou)' || E'\n';
    exception when insufficient_privilege then
        begin
            perform public.minha_ultima_decisao();
            r := r || 'S3 FALHOU (visitante leu decisão)' || E'\n';
        exception when insufficient_privilege then
            r := r || 'S3 ok (visitante sem execute)' || E'\n';
        end;
    end;
    execute 'reset role';

    -- ============ Critério 2: lista ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) filter (where l.id = v_p1), count(*) filter (where l.id = v_p3), max(l.total)
      into v_n, v_m, v_texto
      from public.profissionais_admin('aprovado') l;
    r := r || case when v_n = 1 and v_m = 0
                    and v_texto::int = (select count(*) from public.profissionais where status_aprovacao = 'aprovado')
                   then 'S4a ok (filtro aprovado: prof1 sim, prof3 não, total ' || v_texto || ')'
                   else 'S4a FALHOU' end || E'\n';

    select count(*) into v_n from public.profissionais_admin(null, upper(substr(v_nome1, 2, 4))) l where l.id = v_p1;
    r := r || case when v_n = 1 then 'S4b ok (busca por parte do nome, sem diferenciar maiúsculas)' else 'S4b FALHOU' end || E'\n';

    select count(*) into v_n from public.profissionais_admin(null, '%');
    r := r || case when v_n = 0 then 'S4c ok (% digitado não é curinga)' else 'S4c FALHOU (' || v_n || ')' end || E'\n';

    begin
        perform * from public.profissionais_admin('qualquer');
        r := r || 'S4d FALHOU (status inválido aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'S4d ok (status inválido recusado)' || E'\n';
    end;

    -- ============ Critério 1/3: motivo da suspensão ============
    begin
        perform * from public.alterar_suspensao(v_p1, 'suspender', 'curto');
        r := r || 'S5 FALHOU (suspendeu com motivo curto)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'S5 ok (motivo curto: ' || sqlerrm || ')' || E'\n';
    end;

    -- ============ Critério 3/4: suspender ============
    select * into v_linha from public.alterar_suspensao(v_p1, 'suspender', c_motivo);
    execute 'reset role';
    select count(*) into v_n from public.profissionais where id = v_p1 and status_aprovacao = 'suspenso';
    r := r || case when v_linha.situacao = 'suspenso' and v_n = 1 then 'S6a ok (prof1 suspenso)' else 'S6a FALHOU (' || coalesce(v_linha.situacao, 'null') || ')' end || E'\n';

    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p1 and acao = 'suspensao' and autor_id = v_admin and motivo = c_motivo;
    r := r || case when v_n = 1 then 'S6b ok (histórico: admin e motivo)' else 'S6b FALHOU' end || E'\n';

    -- ============ Critério 5: fora do diretório, sem contratação nova ============
    select count(*) into v_n from public.profissionais_publicos where id = v_p1;
    r := r || case when v_n = 0 then 'S7a ok (fora do diretório)' else 'S7a FALHOU' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, 'Teste de suspensão', 'Rua Teste, 1', now() + interval '2 days');
        r := r || 'S7b FALHOU (cliente contratou suspenso)' || E'\n';
    exception when others then
        r := r || 'S7b ok (contratar suspenso recusado: ' || sqlstate || ')' || E'\n';
    end;
    execute 'reset role';

    -- Contratação aceita antes da suspensão: o cliente ainda conclui (BR06)
    alter table public.contratacoes disable trigger user;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'Teste aceita antes', 'Rua Teste, 2', now() + interval '1 day', 'aceita')
    returning id into v_contr;
    alter table public.contratacoes enable trigger user;

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.contratacoes set status = 'concluida' where id = v_contr;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 1 then 'S7c ok (cliente concluiu a aceita)' else 'S7c FALHOU (nenhuma linha alterada)' end || E'\n';
    exception when others then
        r := r || 'S7c FALHOU (' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 6: o suspenso lê o próprio motivo ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.minha_ultima_decisao();
    r := r || case when v_json ->> 'acao' = 'suspensao' and v_json ->> 'motivo' = c_motivo
                   then 'S8a ok (minha_ultima_decisao: suspensão com motivo)' else 'S8a FALHOU (' || coalesce(v_json::text, 'null') || ')' end || E'\n';
    begin
        update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
        r := r || 'S8b FALHOU (suspenso se reativou)' || E'\n';
    exception when others then
        r := r || 'S8b ok (não se reativa: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.minha_ultima_decisao();
    execute 'reset role';
    r := r || case when v_json is null or v_json ->> 'acao' <> 'suspensao'
                   then 'S8c ok (cada um só lê a própria decisão)' else 'S8c FALHOU' end || E'\n';

    -- ============ Critério 4/7: detalhe e painel ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.detalhe_profissional_admin(v_p1);
    r := r || case when v_json ->> 'status' = 'suspenso'
                    and exists (select 1 from jsonb_array_elements(v_json -> 'historico') h
                                where h ->> 'acao' = 'suspensao' and h ->> 'motivo' = c_motivo)
                   then 'S9a ok (detalhe: suspenso com a suspensão no histórico)' else 'S9a FALHOU' end || E'\n';

    v_json := public.painel_admin();
    r := r || case when (v_json -> 'profissionais' ->> 'suspenso')::int
                        = (select count(*) from public.profissionais where status_aprovacao = 'suspenso')
                    and (v_json -> 'profissionais' ->> 'suspenso')::int >= 1
                   then 'S9b ok (painel conta ' || (v_json -> 'profissionais' ->> 'suspenso') || ' suspenso(s))' else 'S9b FALHOU (' || (v_json -> 'profissionais')::text || ')' end || E'\n';

    select count(*) into v_n from public.fila_analise() f where f.id = v_p1;
    r := r || case when v_n = 0 then 'S9c ok (suspenso não entra na fila)' else 'S9c FALHOU' end || E'\n';

    -- ============ Status já mudou / próprio cadastro ============
    select * into v_linha from public.alterar_suspensao(v_p1, 'suspender', c_motivo);
    r := r || case when v_linha.situacao = 'ignorado' then 'S10a ok (suspender de novo: ' || v_linha.detalhe || ')' else 'S10a FALHOU' end || E'\n';

    select * into v_linha from public.alterar_suspensao(v_p3, 'suspender', c_motivo);
    r := r || case when v_linha.situacao = 'ignorado' then 'S10b ok (pendente não é suspenso)' else 'S10b FALHOU' end || E'\n';

    select * into v_linha from public.alterar_suspensao(v_admin, 'suspender', c_motivo);
    r := r || case when v_linha.situacao = 'ignorado' and v_linha.detalhe like '%próprio cadastro%'
                   then 'S10c ok (admin não age sobre o próprio cadastro)' else 'S10c FALHOU' end || E'\n';

    -- ============ Reativar ============
    select * into v_linha from public.alterar_suspensao(v_p1, 'reativar', null);
    execute 'reset role';
    select count(*) into v_n from public.profissionais_publicos where id = v_p1;
    r := r || case when v_linha.situacao = 'aprovado' and v_n = 1
                   then 'S11a ok (reativado e de volta ao diretório)' else 'S11a FALHOU (' || coalesce(v_linha.situacao, 'null') || ')' end || E'\n';

    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p1 and acao = 'reativacao' and autor_id = v_admin and motivo is null;
    r := r || case when v_n = 1 then 'S11b ok (reativação no histórico, motivo opcional)' else 'S11b FALHOU' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into v_linha from public.alterar_suspensao(v_p1, 'reativar', null);
    execute 'reset role';
    r := r || case when v_linha.situacao = 'ignorado' then 'S11c ok (reativar aprovado: ignorado)' else 'S11c FALHOU' end || E'\n';

    -- O banco barra suspensão sem motivo mesmo fora da função
    begin
        insert into public.analises_profissional (profissional_id, acao, autor_id) values (v_p1, 'suspensao', v_admin);
        r := r || 'S12 FALHOU (histórico de suspensão sem motivo)' || E'\n';
    exception when check_violation then
        r := r || 'S12 ok (check do motivo da suspensão)' || E'\n';
    end;

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
