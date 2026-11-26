-- TESTE 010_reenvio.sql — US-013 (critérios 1, 2, 4 e 5 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/010_reenvio.sql.
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
    v_nome3  text;
    v_n      integer;
    v_json   jsonb;
    v_linha  record;
    r        text := '';
    c_motivo constant text := 'WhatsApp já usado por outro cadastro.';
    c_desc   constant text := 'Descrição com menos de 30 caracteres';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof3@)';
    end if;
    select nome into v_nome3 from public.usuarios where id = v_p3;

    -- Preparação como postgres: prof3 pendente, com descrição curta (gera pendência).
    update public.profissionais
       set status_aprovacao = 'pendente', descricao = 'Curta'
     where id = v_p3;

    -- ============ Quem pode chamar ============
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform public.reenviar_para_analise();
        r := r || 'R1 FALHOU (visitante reenviou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'R1 ok (visitante sem execute)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.reenviar_para_analise();
        r := r || 'R2 FALHOU (cliente reenviou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'R2 ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 4: só recusado reenvia (pendente e suspenso: nada muda) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.reenviar_para_analise();
        r := r || 'R3 FALHOU (pendente reenviou)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'R3 ok (pendente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    update public.profissionais set status_aprovacao = 'suspenso' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.reenviar_para_analise();
        r := r || 'R4 FALHOU (suspenso reenviou)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'R4 ok (suspenso recusado)' || E'\n';
    end;
    execute 'reset role';

    select count(*) into v_n from public.analises_profissional where profissional_id = v_p3 and acao = 'reenvio'
       and created_at = now();
    r := r || case when v_n = 0 and (select status_aprovacao from public.profissionais where id = v_p3) = 'suspenso'
                   then 'R5 ok (nada mudou: sem reenvio no histórico)' else 'R5 FALHOU' end || E'\n';

    -- ============ Critério 1: admin recusa com motivo, profissional lê ============
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    perform public.triar_profissional(v_p3);   -- triagem com a pendência da descrição

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'recusar', c_motivo);
    execute 'reset role';
    r := r || case when v_linha.situacao = 'recusado' then 'R6 ok (admin recusou prof3)' else 'R6 FALHOU (' || coalesce(v_linha.situacao, 'null') || ' / ' || coalesce(v_linha.detalhe, '') || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.minha_ultima_decisao();
    r := r || case when v_json ->> 'acao' = 'recusa' and v_json ->> 'motivo' = c_motivo
                   then 'R7 ok (prof3 lê o motivo da recusa)' else 'R7 FALHOU (' || coalesce(v_json::text, 'null') || ')' end || E'\n';

    -- ============ Critério 2: pendências da triagem ============
    v_json := public.minhas_pendencias();
    r := r || case when jsonb_typeof(v_json) = 'array' and v_json ? c_desc
                   then 'R8 ok (prof3 lê a pendência da descrição)' else 'R8 FALHOU (' || coalesce(v_json::text, 'null') || ')' end || E'\n';

    -- ============ Critério 4: reenvio ============
    v_json := public.reenviar_para_analise();
    execute 'reset role';
    r := r || case when v_json ->> 'status' = 'pendente' and (v_json -> 'pendencias') ? c_desc
                    and (select status_aprovacao from public.profissionais where id = v_p3) = 'pendente'
                   then 'R9 ok (recusado voltou para pendente; pendência devolvida)' else 'R9 FALHOU (' || coalesce(v_json::text, 'null') || ')' end || E'\n';

    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p3 and acao = 'reenvio' and autor_id = v_p3 and motivo is null and created_at = now();
    r := r || case when v_n = 1 then 'R10 ok (reenvio no histórico, autor = o profissional)' else 'R10 FALHOU (' || v_n || ')' end || E'\n';

    -- Reenviar de novo (já está pendente): recusado e sem segunda linha.
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.reenviar_para_analise();
        r := r || 'R11 FALHOU (reenviou duas vezes)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'R11 ok (segundo reenvio recusado)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Admin: fila e histórico ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.fila_analise() f where f.id = v_p3 and f.na_fila_desde = now();
    r := r || case when v_n = 1 then 'R12 ok (prof3 de volta à fila, desde o reenvio)' else 'R12 FALHOU' end || E'\n';

    v_json := public.detalhe_profissional_admin(v_p3);
    r := r || case when exists (select 1 from jsonb_array_elements(v_json -> 'historico') h
                                where h ->> 'acao' = 'reenvio' and h ->> 'autor' = v_nome3)
                   then 'R13 ok (detalhe: reenvio com o nome do profissional)' else 'R13 FALHOU' end || E'\n';
    execute 'reset role';

    -- ============ Critério 5: só as próprias análises, sem campos internos ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform 1 from public.analises_profissional limit 1;
        r := r || 'R14 FALHOU (profissional leu a tabela direto)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'R14 ok (tabela fechada para o app)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.minha_ultima_decisao();
    r := r || case when coalesce(v_json ->> 'motivo', '') <> c_motivo
                   then 'R15 ok (prof1 não lê a recusa do prof3)' else 'R15 FALHOU' end || E'\n';
    execute 'reset role';

    -- Triagem com um sinal de suspeita (formato da US-021): não chega ao profissional.
    insert into public.analises_profissional (profissional_id, acao, resultado, checagens)
    values (v_p3, 'triagem', 'suspeito', jsonb_build_array(
        jsonb_build_object('codigo', 'descricao_min', 'tipo', 'obrigatoria', 'ok', false, 'mensagem', c_desc),
        jsonb_build_object('codigo', 'telefone_repetido', 'tipo', 'suspeita', 'ok', false, 'mensagem', 'SINAL INTERNO')));

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.minhas_pendencias();
    execute 'reset role';
    r := r || case when v_json = jsonb_build_array(c_desc)
                   then 'R16 ok (sinal de suspeita não aparece para o profissional)' else 'R16 FALHOU (' || v_json::text || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
