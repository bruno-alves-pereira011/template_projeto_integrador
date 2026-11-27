-- TESTE 017_contratacao_campos_obrigatorios.sql — DEBT-012
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/017_contratacao_campos_obrigatorios.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: cliente@ e prof1@helpme.test. Força o prof1 como aprovado.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1  uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_ok  bigint;
    v_d   text;
    r text := '';
begin
    if v_cli is null or v_p1 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (cliente@, prof1@)';
    end if;

    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;

    -- ============ Pelo app (cliente logado), como a API faria ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, '   ', 'Rua do Teste, 17', now() + interval '2 days');
        r := r || 'E1 FALHOU (descrição só com espaços foi aceita)' || E'\n';
    exception when check_violation then
        r := r || 'E1 ok (descrição só com espaços recusada)' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, 'TESTE 017', '   ', now() + interval '2 days');
        r := r || 'E2 FALHOU (endereço só com espaços foi aceito)' || E'\n';
    exception when check_violation then
        r := r || 'E2 ok (endereço só com espaços recusado)' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, '', '', now() + interval '2 days');
        r := r || 'E3 FALHOU (texto vazio foi aceito)' || E'\n';
    exception when check_violation then
        r := r || 'E3 ok (texto vazio recusado)' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, E' \t\n\r ', E'\n\n', now() + interval '2 days');
        r := r || 'E4 FALHOU (tab/quebra de linha foi aceito)' || E'\n';
    exception when check_violation then
        r := r || 'E4 ok (tab e quebra de linha também contam como vazio)' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, '  TESTE 017 válida  ', ' Rua do Teste, 17 ', now() + interval '2 days')
        returning id into v_ok;
        r := r || 'E5 ok (texto com espaços em volta continua aceito)' || E'\n';
    exception when others then
        r := r || 'E5 FALHOU (' || sqlerrm || ')' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, 'x', 'y', now() + interval '2 days');
        r := r || 'E6 ok (um caractere basta)' || E'\n';
    exception when others then
        r := r || 'E6 FALHOU (' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    -- ============ Nem o painel (postgres) deixa em branco ============
    begin
        update public.contratacoes set descricao = '  ' where id = v_ok;
        r := r || 'E7 FALHOU (painel deixou a descrição em branco)' || E'\n';
    exception when check_violation then
        r := r || 'E7 ok (painel também não deixa em branco)' || E'\n';
    end;

    select descricao into v_d from public.contratacoes where id = v_ok;
    r := r || case when v_d = '  TESTE 017 válida  ' then 'E8 ok (a válida ficou como foi gravada)'
                   else 'E8 FALHOU (' || coalesce(v_d, 'null') || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
