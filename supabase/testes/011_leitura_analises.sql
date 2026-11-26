-- TESTE 011_leitura_analises.sql — US-013 (critérios 1, 5 e 8 pela política; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/011_leitura_analises.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof1@ e prof3@helpme.test.
-- O status do prof3 é forçado aqui dentro (e desfeito no final).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_n      integer;
    v_texto  text;
    v_linha  record;
    r        text := '';
    c_motivo constant text := 'WhatsApp já usado por outro cadastro.';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof3@)';
    end if;

    -- Preparação como postgres: prof3 pendente, com triagem; o admin recusa com motivo.
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    perform public.triar_profissional(v_p3);

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'recusar', c_motivo);
    execute 'reset role';
    if v_linha.situacao is distinct from 'recusado' then
        raise exception 'RELATORIO: preparação falhou (recusa do prof3: %)', coalesce(v_linha.detalhe, v_linha.situacao);
    end if;

    -- ============ Critério 1: o dono lê a própria recusa pela tabela ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select a.motivo into v_texto
      from public.analises_profissional a
     where a.profissional_id = v_p3 and a.acao = 'recusa'
     order by a.created_at desc, a.id desc
     limit 1;
    r := r || case when v_texto = c_motivo then 'L1 ok (prof3 lê o motivo da própria recusa)' else 'L1 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    -- ============ Critério 5: colunas internas fechadas ============
    begin
        perform a.checagens from public.analises_profissional a limit 1;
        r := r || 'L2 FALHOU (leu checagens)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L2 ok (checagens fechada)' || E'\n';
    end;

    begin
        perform a.resultado from public.analises_profissional a limit 1;
        r := r || 'L3 FALHOU (leu resultado)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L3 ok (resultado fechado)' || E'\n';
    end;

    begin
        perform a.autor_id from public.analises_profissional a limit 1;
        r := r || 'L4 FALHOU (leu autor_id)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L4 ok (autor_id fechado)' || E'\n';
    end;

    begin
        perform * from public.analises_profissional limit 1;
        r := r || 'L5 FALHOU (select * passou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L5 ok (select * recusado)' || E'\n';
    end;

    -- Linhas de triagem não aparecem nem para o dono.
    select count(*) into v_n from public.analises_profissional a where a.acao = 'triagem';
    r := r || case when v_n = 0 then 'L6 ok (triagem invisível para o dono)' else 'L6 FALHOU (' || v_n || ')' end || E'\n';

    -- ============ Critério 8: escrita fechada ============
    begin
        insert into public.analises_profissional (profissional_id, acao) values (v_p3, 'reenvio');
        r := r || 'L7 FALHOU (profissional gravou no histórico)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L7 ok (insert recusado)' || E'\n';
    end;

    begin
        update public.analises_profissional set motivo = 'alterado' where profissional_id = v_p3;
        r := r || 'L8 FALHOU (profissional alterou o histórico)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L8 ok (update recusado)' || E'\n';
    end;

    begin
        delete from public.analises_profissional where profissional_id = v_p3;
        r := r || 'L9 FALHOU (profissional apagou o histórico)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L9 ok (delete recusado)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 5: ninguém lê as linhas de outro ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.analises_profissional a where a.profissional_id = v_p3;
    execute 'reset role';
    r := r || case when v_n = 0 then 'L10 ok (prof1 não vê as linhas do prof3)' else 'L10 FALHOU (' || v_n || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.analises_profissional a;
    execute 'reset role';
    r := r || case when v_n = 0 then 'L11 ok (cliente não vê nenhuma linha)' else 'L11 FALHOU (' || v_n || ')' end || E'\n';

    -- O admin continua lendo pelas funções da 004, não pela tabela.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.analises_profissional a where a.profissional_id = v_p3;
    execute 'reset role';
    r := r || case when v_n = 0 then 'L12 ok (admin não lê a tabela direto)' else 'L12 FALHOU (' || v_n || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform a.motivo from public.analises_profissional a limit 1;
        r := r || 'L13 FALHOU (visitante leu)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'L13 ok (visitante sem acesso)' || E'\n';
    end;
    execute 'reset role';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
