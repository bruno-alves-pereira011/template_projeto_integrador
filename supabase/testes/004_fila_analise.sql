-- TESTE 004_fila_analise.sql — US-015 (critérios 1 a 7 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/004_fila_analise.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test (admin), cliente@, prof1@, prof2@, prof3@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2     uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_n      integer;
    v_texto  text;
    v_json   jsonb;
    v_linha  record;
    r        text := '';

begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p2 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof2@, prof3@)';
    end if;
    if not exists (select 1 from public.administradores where usuario_id = v_admin) then
        raise exception 'RELATORIO: admin@helpme.test não está em administradores (ver supabase/README.md)';
    end if;

    -- Preparação como postgres: prof3 pendente, sem histórico
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    delete from public.analises_profissional where profissional_id in (v_p1, v_p2, v_p3);

    -- ============ Critério 7: quem não é admin recebe erro de permissão ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.fila_analise();
        r := r || 'F7a FALHOU (cliente leu a fila)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F7a ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.decidir_profissionais(array[v_p3], 'aprovar');
        r := r || 'F7b FALHOU (profissional se aprovou pela função)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F7b ok (profissional: ' || sqlerrm || ')' || E'\n';
    end;
    begin
        perform public.detalhe_profissional_admin(v_p1);
        r := r || 'F7c FALHOU (profissional leu detalhe admin)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F7c ok (detalhe recusado)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform * from public.fila_analise();
        r := r || 'F7d FALHOU (visitante leu a fila)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F7d ok (visitante sem execute)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 1: fila ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into v_n from public.fila_analise() f where f.id = v_p3 and f.triagem is null and f.nome is not null;
    r := r || case when v_n = 1 then 'F1a ok (prof3 na fila, sem triagem)' else 'F1a FALHOU' end || E'\n';
    select count(*) into v_n from public.fila_analise() f where f.id in (v_p1, v_p2);
    r := r || case when v_n = 0 then 'F1b ok (aprovados fora da fila)' else 'F1b FALHOU' end || E'\n';

    -- ============ Critério 2: detalhe ============
    select public.detalhe_profissional_admin(v_p3) into v_json;
    r := r || case when v_json ->> 'status' = 'pendente' and v_json ? 'historico' and not v_json ? 'data_nascimento'
                   then 'F2 ok (detalhe sem data de nascimento)' else 'F2 FALHOU' end || E'\n';

    -- ============ Critério 3: recusa exige motivo ============
    begin
        perform * from public.decidir_profissionais(array[v_p3], 'recusar', 'curto');
        r := r || 'F3a FALHOU (recusou com motivo curto)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'F3a ok (motivo curto: ' || sqlerrm || ')' || E'\n';
    end;
    begin
        perform * from public.decidir_profissionais(array[v_p3, v_p2], 'recusar', 'Motivo grande o suficiente');
        r := r || 'F3b FALHOU (recusa em lote)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'F3b ok (recusa só individual)' || E'\n';
    end;

    -- ============ Critérios 3 e 6: aprovar individual + histórico ============
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'aprovar');
    r := r || case when v_linha.situacao = 'aprovado' then 'F3c ok (aprovado)' else 'F3c FALHOU (' || v_linha.situacao || ')' end || E'\n';
    execute 'reset role';

    select count(*) into v_n from public.profissionais_publicos where id = v_p3;
    r := r || case when v_n = 1 then 'F3d ok (aparece no diretório)' else 'F3d FALHOU' end || E'\n';
    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p3 and acao = 'aprovacao' and autor_id = v_admin;
    r := r || case when v_n = 1 then 'F6a ok (histórico com o admin como autor)' else 'F6a FALHOU' end || E'\n';

    -- ============ Critério 5: segunda decisão é ignorada ============
    execute 'set local role authenticated';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'recusar', 'Decisão tardia de outro admin');
    r := r || case when v_linha.situacao = 'ignorado' then 'F5 ok (' || v_linha.detalhe || ')' else 'F5 FALHOU' end || E'\n';

    -- ============ Critério 6: histórico não é lido, alterado nem apagado pelo app ============
    begin
        update public.analises_profissional set motivo = 'x' where profissional_id = v_p3;
        r := r || 'F6b FALHOU (histórico alterado)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F6b ok (update recusado)' || E'\n';
    end;
    begin
        delete from public.analises_profissional where profissional_id = v_p3;
        r := r || 'F6c FALHOU (histórico apagado)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F6c ok (delete recusado)' || E'\n';
    end;
    begin
        insert into public.analises_profissional (profissional_id, acao, autor_id) values (v_p2, 'aprovacao', v_admin);
        r := r || 'F6d FALHOU (histórico inserido direto)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'F6d ok (insert recusado)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 4: lote só aprova pendente + verde ============
    update public.profissionais set status_aprovacao = 'pendente' where id in (v_p2, v_p3);
    insert into public.analises_profissional (profissional_id, acao, resultado, checagens) values
        (v_p2, 'triagem', 'verde', '[]'),
        (v_p3, 'triagem', 'suspeito', '[{"codigo":"whatsapp_repetido","tipo":"suspeita","ok":false,"mensagem":"WhatsApp igual ao de outro profissional"}]');

    execute 'set local role authenticated';
    select string_agg(coalesce(d.nome, '?') || '=' || d.situacao || coalesce(' (' || d.detalhe || ')', ''), '; ' order by d.situacao)
      into v_texto
      from public.decidir_profissionais(array[v_p2, v_p3, v_p1], 'aprovar', null, true) d;
    execute 'reset role';

    select status_aprovacao into v_linha from public.profissionais where id = v_p2;
    select count(*) into v_n from public.profissionais where id = v_p3 and status_aprovacao = 'pendente';
    r := r || case when v_linha.status_aprovacao = 'aprovado' and v_n = 1
                   then 'F4 ok (' || v_texto || ')' else 'F4 FALHOU (' || coalesce(v_texto, '-') || ')' end || E'\n';

    -- Fila mostra o motivo da triagem
    execute 'set local role authenticated';
    select f.triagem || ': ' || array_to_string(f.triagem_motivos, ', ') into v_texto
      from public.fila_analise() f where f.id = v_p3;
    r := r || case when v_texto like 'suspeito: WhatsApp igual%' then 'F1c ok (' || v_texto || ')' else 'F1c FALHOU (' || coalesce(v_texto, '-') || ')' end || E'\n';

    -- Recusa válida grava o motivo
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'recusar', 'WhatsApp já usado por outro cadastro');
    execute 'reset role';
    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p3 and acao = 'recusa' and motivo = 'WhatsApp já usado por outro cadastro';
    r := r || case when v_linha.situacao = 'recusado' and v_n = 1 then 'F3e ok (recusado com motivo)' else 'F3e FALHOU' end || E'\n';

    -- ============ Admin não decide o próprio cadastro (004) ============
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    insert into public.administradores (usuario_id) values (v_p3);
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'aprovar');
    r := r || case when v_linha.situacao = 'ignorado' then 'F8a ok (' || v_linha.detalhe || ')' else 'F8a FALHOU' end || E'\n';
    begin
        update public.profissionais set status_aprovacao = 'aprovado' where id = v_p3;
        r := r || 'F8b FALHOU (admin mudou o próprio status direto)' || E'\n';
    exception when others then
        r := r || 'F8b ok (direto pela API: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    raise exception E'RELATORIO:\n%', r;
end $$;
