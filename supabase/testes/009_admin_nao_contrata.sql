-- TESTE 009_admin_nao_contrata.sql — DEBT-009 (BR10/BR11: admin não contrata)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/009_admin_nao_contrata.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@ e prof1@helpme.test (prof1 precisa estar aprovado).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_msg    text;
    v_id     bigint;
    r        text := '';
begin
    if v_admin is null or v_cli is null or v_p1 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@)';
    end if;
    if not exists (select 1 from public.profissionais where id = v_p1 and status_aprovacao = 'aprovado') then
        raise exception 'RELATORIO: prof1 não está aprovado; aprove-o antes (o teste precisa de um profissional contratável)';
    end if;

    -- A1: o admin, logado pelo app (papel authenticated), tenta contratar o prof1
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_admin, v_p1, 'teste 009', 'Rua Teste, 1', now() + interval '2 days');
        r := r || 'A1 FALHOU (o admin conseguiu contratar)' || E'\n';
    exception when insufficient_privilege then
        get stacked diagnostics v_msg = message_text;
        r := r || case when v_msg ilike '%Administrador não contrata%'
                       then 'A1 ok (admin não contrata: ' || v_msg || ')'
                       else 'A1 FALHOU (recusado por outro motivo: ' || v_msg || ')' end || E'\n';
    end;
    execute 'reset role';

    -- A2: o cliente continua contratando (a linha é desfeita no fim)
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, 'teste 009', 'Rua Teste, 1', now() + interval '2 days')
        returning id into v_id;
        r := r || case when v_id is not null then 'A2 ok (cliente contrata normalmente)'
                       else 'A2 FALHOU (insert sem id)' end || E'\n';
    exception when others then
        get stacked diagnostics v_msg = message_text;
        r := r || 'A2 FALHOU (cliente não conseguiu contratar: ' || v_msg || ')' || E'\n';
    end;
    execute 'reset role';

    -- A3: nem por fora do app (postgres, sem RLS) entra contratação com admin como cliente
    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_admin, v_p1, 'teste 009', 'Rua Teste, 1', now() + interval '2 days');
        r := r || 'A3 FALHOU (entrou contratação com admin como cliente)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'A3 ok (o trigger barra também fora do RLS)' || E'\n';
    end;

    -- A4: a função do trigger não pode ser chamada pela API
    r := r || case when not has_function_privilege('authenticated', 'public.impedir_admin_contratar()', 'EXECUTE')
                    and not has_function_privilege('anon', 'public.impedir_admin_contratar()', 'EXECUTE')
                   then 'A4 ok (impedir_admin_contratar fora da API)'
                   else 'A4 FALHOU (anon/authenticated podem executar impedir_admin_contratar)' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
