-- TESTE 008_contratacoes_admin.sql — US-020 (critérios 2, 3 e 6 no banco; BR21, NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/008_contratacoes_admin.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof1@, prof2@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2     uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_nome1  text;
    v_ncli   text;
    v_n      integer;
    v_m      integer;
    v_tot    bigint;
    v_json   jsonb;
    v_ok     boolean;
    r        text := '';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p2 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof2@)';
    end if;
    select nome into v_nome1 from public.usuarios where id = v_p1;
    select nome into v_ncli from public.usuarios where id = v_cli;

    -- Dados conhecidos (como postgres, sem os triggers do app): 6 contratações do cliente
    delete from public.contratacoes;
    alter table public.contratacoes disable trigger user;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status, created_at)
    values (v_cli, v_p1, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'solicitada', now() - interval '1 day'),
           (v_cli, v_p1, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'aceita',     now() - interval '3 days'),
           (v_cli, v_p1, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'concluida',  now() - interval '20 days'),
           (v_cli, v_p2, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'recusada',   now() - interval '2 days'),
           (v_cli, v_p2, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'cancelada',  now() - interval '60 days'),
           (v_cli, v_p2, 'teste 008', 'Rua Teste, 1', now() + interval '1 day', 'concluida',  now() - interval '200 days');
    alter table public.contratacoes enable trigger user;

    -- ============ Critério 6: só admin ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.contratacoes_admin();
        r := r || 'C1 FALHOU (cliente listou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'C1 ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform * from public.contratacoes_admin();
        r := r || 'C2 FALHOU (profissional listou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'C2 ok (profissional recusado)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform * from public.contratacoes_admin();
        r := r || 'C3 FALHOU (visitante listou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'C3 ok (visitante sem execute)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 2/3: filtros ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*), max(total) into v_n, v_tot from public.contratacoes_admin();
    r := r || case when v_n = 6 and v_tot = 6 then 'C4 ok (todas: 6)' else 'C4 FALHOU (' || v_n || '/' || coalesce(v_tot, 0) || ')' end || E'\n';

    select count(*) into v_n from public.contratacoes_admin(null, 30);
    select count(*) into v_m from public.contratacoes_admin(null, 7);
    r := r || case when v_n = 4 and v_m = 3 then 'C5 ok (30 dias: 4; 7 dias: 3)' else 'C5 FALHOU (' || v_n || ', ' || v_m || ')' end || E'\n';

    select count(*) into v_n from public.contratacoes_admin('concluida');
    r := r || case when v_n = 2 then 'C6 ok (status concluída: 2)' else 'C6 FALHOU (' || v_n || ')' end || E'\n';

    select count(*) into v_n from public.contratacoes_admin(null, null, null, v_p1);
    r := r || case when v_n = 3 then 'C7 ok (só do prof1: 3)' else 'C7 FALHOU (' || v_n || ')' end || E'\n';

    select count(*) into v_n from public.contratacoes_admin(null, null, lower(substr(v_nome1, 1, 4)));
    select count(*) into v_m from public.contratacoes_admin(null, null, upper(substr(v_ncli, 1, 4)));
    r := r || case when v_n >= 3 and v_m = 6 then 'C8 ok (busca pelo nome do profissional e do cliente)' else 'C8 FALHOU (' || v_n || ', ' || v_m || ')' end || E'\n';

    select count(*) into v_n from public.contratacoes_admin(null, null, '%');
    r := r || case when v_n = 0 then 'C9 ok (% digitado não é curinga)' else 'C9 FALHOU (' || v_n || ')' end || E'\n';

    -- Paginação: duas páginas de 4 + 2, sem repetir, mais recente primeiro
    select count(*) into v_n from (
        select id from public.contratacoes_admin(null, null, null, null, 4, 0)
        intersect
        select id from public.contratacoes_admin(null, null, null, null, 4, 4)) x;
    select count(*) into v_m from public.contratacoes_admin(null, null, null, null, 4, 4);
    select bool_and(ordenado) into v_ok from (
        select (criada_em >= lead(criada_em) over (order by criada_em desc)) is not false as ordenado
        from public.contratacoes_admin()) o;
    r := r || case when v_n = 0 and v_m = 2 and v_ok then 'C10 ok (páginas 4 + 2 sem repetição, mais recentes primeiro)'
                   else 'C10 FALHOU' end || E'\n';

    -- BR21 / minimização: nada de endereço, descrição, telefone ou mensagem
    select to_jsonb(l) into v_json from public.contratacoes_admin() l limit 1;
    r := r || case when not (v_json ?| array['endereco', 'descricao', 'telefone', 'whatsapp', 'mensagem', 'texto', 'cliente_id'])
                    and v_json::text not like '%Rua Teste%' and v_json::text not like '%teste 008%'
                   then 'C11 ok (sem endereço, descrição, telefone ou chat)' else 'C11 FALHOU (' || v_json::text || ')' end || E'\n';

    begin
        perform * from public.contratacoes_admin('qualquer');
        r := r || 'C12a FALHOU (status inválido aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C12a ok (status inválido recusado)' || E'\n';
    end;
    begin
        perform * from public.contratacoes_admin(null, 15);
        r := r || 'C12b FALHOU (período inválido aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C12b ok (período só 7, 30 ou 90)' || E'\n';
    end;
    begin
        perform * from public.contratacoes_admin(null, null, null, null, 500);
        r := r || 'C12c FALHOU (limite 500 aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'C12c ok (limite máximo 100)' || E'\n';
    end;
    execute 'reset role';

    -- BR21: o admin continua sem ler mensagens direto
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.mensagens;
    select count(*) into v_m from public.contratacoes;
    execute 'reset role';
    r := r || case when v_n = 0 and v_m = 0 then 'C13 ok (admin não lê mensagens nem contratações direto)'
                   else 'C13 FALHOU (mensagens ' || v_n || ', contratações ' || v_m || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
