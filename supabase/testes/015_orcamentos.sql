-- TESTE 015_orcamentos.sql — US-022 (FR27–FR30, BR24–BR26)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/015_orcamentos.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@, cliente@, prof1@ e prof2@helpme.test.
-- Cria aqui dentro (e desfaz no final) duas contratações cliente → prof1:
-- uma 'aceita' e uma 'solicitada'. Força o prof1 como aprovado.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli   uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1    uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2    uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_aceita     bigint;
    v_solicitada bigint;
    v_orc1  bigint;
    v_orc2  bigint;
    v_res   jsonb;
    v_n     integer;
    v_texto text;
    r       text := '';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p2 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof2@)';
    end if;

    -- Preparação como postgres.
    update public.profissionais set status_aprovacao = 'aprovado' where id = v_p1;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 015 aceita', 'Rua do Teste, 15', now() + interval '2 days', 'aceita')
    returning id into v_aceita;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'TESTE 015 solicitada', 'Rua do Teste, 15', now() + interval '2 days', 'solicitada')
    returning id into v_solicitada;

    -- ============ Enviar (profissional) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    v_res := public.enviar_orcamento(v_aceita, 35000, '  Inclui material  ');
    v_orc1 := (v_res ->> 'id')::bigint;
    r := r || case when v_res ->> 'situacao' = 'aguardando' then 'O1 ok (profissional envia R$ 350,00)' else 'O1 FALHOU (' || v_res::text || ')' end || E'\n';

    select o.observacao into v_texto from public.orcamentos o where o.id = v_orc1;
    r := r || case when v_texto = 'Inclui material' then 'O2 ok (observação gravada sem espaços nas pontas)' else 'O2 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    begin
        perform public.enviar_orcamento(v_aceita, 30000, null);
        r := r || 'O3 FALHOU (segundo valor aguardando aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O3 ok (um aguardando por vez: ' || sqlerrm || ')' || E'\n';
    end;

    begin
        perform public.enviar_orcamento(v_solicitada, 35000, null);
        r := r || 'O4 FALHOU (orçamento em contratação solicitada)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O4 ok (só contratação aceita)' || E'\n';
    end;

    begin
        update public.orcamentos set valor_centavos = 100 where id = v_orc1;
        r := r || 'O5 FALHOU (profissional alterou o valor pela tabela)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O5 ok (sem update direto na tabela)' || E'\n';
    end;

    begin
        insert into public.orcamentos (contratacao_id, valor_centavos) values (v_aceita, 100);
        r := r || 'O6 FALHOU (insert direto na tabela)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O6 ok (sem insert direto na tabela)' || E'\n';
    end;
    execute 'reset role';

    -- Outro profissional e o cliente não enviam; terceiros não leem.
    perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.enviar_orcamento(v_aceita, 1000, null);
        r := r || 'O7 FALHOU (outro profissional enviou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O7 ok (outro profissional não envia)' || E'\n';
    end;
    select count(*) into v_n from public.orcamentos o where o.contratacao_id = v_aceita;
    r := r || case when v_n = 0 then 'O8 ok (outro profissional não lê)' else 'O8 FALHOU (' || v_n || ')' end || E'\n';
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into v_n from public.orcamentos o where o.contratacao_id = v_aceita;
    execute 'reset role';
    r := r || case when v_n = 0 then 'O9 ok (admin não lê pela tabela)' else 'O9 FALHOU (' || v_n || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform 1 from public.orcamentos limit 1;
        r := r || 'O10 FALHOU (visitante leu orcamentos)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O10 ok (visitante sem acesso)' || E'\n';
    end;
    begin
        perform public.responder_orcamento(v_orc1, true);
        r := r || 'O11 FALHOU (visitante respondeu)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O11 ok (visitante não chama as funções)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Responder (cliente) ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into v_n from public.orcamentos o where o.contratacao_id = v_aceita;
    r := r || case when v_n = 1 then 'O12 ok (cliente lê o orçamento da própria contratação)' else 'O12 FALHOU (' || v_n || ')' end || E'\n';

    begin
        perform public.enviar_orcamento(v_aceita, 1000, null);
        r := r || 'O13 FALHOU (cliente enviou orçamento)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O13 ok (cliente não envia orçamento)' || E'\n';
    end;

    v_res := public.responder_orcamento(v_orc1, false);
    r := r || case when v_res ->> 'situacao' = 'recusado'
                    and (select o.respondido_em is not null from public.orcamentos o where o.id = v_orc1)
                   then 'O14 ok (cliente recusa; data da resposta gravada)' else 'O14 FALHOU (' || v_res::text || ')' end || E'\n';

    begin
        perform public.responder_orcamento(v_orc1, true);
        r := r || 'O15 FALHOU (respondeu duas vezes)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O15 ok (resposta vale uma vez)' || E'\n';
    end;
    execute 'reset role';

    -- Novo valor depois da recusa; o profissional não responde.
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.enviar_orcamento(v_aceita, 30000, null);
    v_orc2 := (v_res ->> 'id')::bigint;
    r := r || case when v_res ->> 'situacao' = 'aguardando' then 'O16 ok (novo valor depois da recusa)' else 'O16 FALHOU (' || v_res::text || ')' end || E'\n';
    begin
        perform public.responder_orcamento(v_orc2, true);
        r := r || 'O17 FALHOU (profissional aprovou o próprio valor)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'O17 ok (profissional não responde)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.responder_orcamento(v_orc2, true);
    select count(*) into v_n from public.orcamentos o where o.contratacao_id = v_aceita;
    execute 'reset role';
    r := r || case when v_res ->> 'situacao' = 'aprovado' and v_n = 2
                   then 'O18 ok (cliente aprova; histórico com 2 valores)' else 'O18 FALHOU (' || v_res::text || ', ' || v_n || ')' end || E'\n';

    -- ============ Depois do aprovado e limites ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.enviar_orcamento(v_aceita, 40000, null);
        r := r || 'O19 FALHOU (novo valor depois do aprovado)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O19 ok (nada depois do valor aprovado)' || E'\n';
    end;
    execute 'reset role';

    -- Limites conferidos numa contratação sem orçamento (a solicitada vira aceita aqui dentro).
    update public.contratacoes set status = 'aceita' where id = v_solicitada;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.enviar_orcamento(v_solicitada, 99, null);
        r := r || 'O20 FALHOU (R$ 0,99 aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O20 ok (abaixo de R$ 1,00 recusado)' || E'\n';
    end;
    begin
        perform public.enviar_orcamento(v_solicitada, 10000001, null);
        r := r || 'O21 FALHOU (acima de R$ 100.000,00 aceito)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O21 ok (acima de R$ 100.000,00 recusado)' || E'\n';
    end;
    begin
        perform public.enviar_orcamento(v_solicitada, 100, repeat('a', 201));
        r := r || 'O22 FALHOU (observação com 201 aceita)' || E'\n';
    exception when invalid_parameter_value then
        r := r || 'O22 ok (observação com 201 recusada)' || E'\n';
    end;
    v_res := public.enviar_orcamento(v_solicitada, 10000000, '   ');
    execute 'reset role';
    r := r || case when v_res ->> 'situacao' = 'aguardando'
                    and (select o.observacao is null from public.orcamentos o where o.id = (v_res ->> 'id')::bigint)
                   then 'O23 ok (R$ 100.000,00 aceito; observação em branco vira vazia)' else 'O23 FALHOU (' || v_res::text || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
