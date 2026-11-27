-- ===================================================================
-- HelpMe — teste de RLS do chat (US-010: FR14, BR08, NFR07)
-- ===================================================================
-- COMO RODAR: colar tudo no SQL Editor do Supabase e executar.
-- O RESULTADO APARECE COMO ERRO DE PROPÓSITO: o último comando lança uma
-- exceção com o relatório. Assim o Postgres desfaz tudo e NADA fica salvo.
-- Leia o relatório na mensagem de erro: a última linha traz o total.
--
-- PRÉ-REQUISITO: usuários do seed (cliente@, prof1@ e prof2@helpme.test),
-- com prof1 aprovado. prof2 faz o papel de terceiro usuário.
-- NÃO COBRE: entrega do Realtime (só dá para ver com duas abas abertas).
-- Roteiro completo: docs/tasks/testes_contratacao.md
-- ===================================================================

do $$
declare
    v_cli uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_pro uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_ter uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_id  bigint;
    v_fim bigint;
    v_status text;
    v_obtido text;
    v_relatorio text := '';
    v_passou int := 0;
    v_falhou int := 0;
    v_ins text;
    v_casos jsonb := '[]';
    v_caso jsonb;
begin
    if v_cli is null or v_pro is null or v_ter is null then
        raise exception 'Usuários de teste não encontrados (ver cabeçalho).';
    end if;

    -- Executa p_sql como o usuário/papel indicado. Devolve 'ok:<linhas>' ou 'erro:<sqlstate>'.
    execute $f$
        create function pg_temp.tentar(p_uid uuid, p_papel text, p_sql text) returns text
        language plpgsql as $c$
        declare
            v_n bigint;
            v_saida text;
        begin
            perform set_config('request.jwt.claims',
                json_build_object('sub', p_uid, 'role', p_papel)::text, true);
            execute format('set local role %I', p_papel);
            begin
                execute p_sql;
                get diagnostics v_n = row_count;
                v_saida := 'ok:' || v_n;
            exception when others then
                v_saida := 'erro:' || sqlstate;
            end;
            execute 'reset role';
            return v_saida;
        end;
        $c$
    $f$;

    -- Contratação ativa de cliente com prof1
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
    values (v_cli, v_pro, 'teste RLS chat', 'Rua Teste', now() + interval '1 day')
    returning id into v_id;

    v_ins := 'insert into public.mensagens (contratacao_id, autor_id, conteudo) values (' || v_id || ', ';

    v_casos := jsonb_build_array(
        jsonb_build_array('T01 cliente envia em solicitada', v_cli, 'authenticated', v_ins || quote_literal(v_cli) || ', ''oi'')', 'ok:1'),
        jsonb_build_array('T02 profissional envia em solicitada', v_pro, 'authenticated', v_ins || quote_literal(v_pro) || ', ''ola'')', 'ok:1'),
        jsonb_build_array('T03 cliente le as 2 mensagens', v_cli, 'authenticated', 'select 1 from public.mensagens where contratacao_id = ' || v_id, 'ok:2'),
        jsonb_build_array('T04 profissional le as 2 mensagens', v_pro, 'authenticated', 'select 1 from public.mensagens where contratacao_id = ' || v_id, 'ok:2'),
        jsonb_build_array('T05 terceiro nao le mensagens (criterio 6)', v_ter, 'authenticated', 'select 1 from public.mensagens where contratacao_id = ' || v_id, 'ok:0'),
        jsonb_build_array('T06 terceiro nao envia em nome proprio (criterio 6)', v_ter, 'authenticated', v_ins || quote_literal(v_ter) || ', ''x'')', 'erro:42501'),
        jsonb_build_array('T07 terceiro nao envia como cliente (criterio 6)', v_ter, 'authenticated', v_ins || quote_literal(v_cli) || ', ''x'')', 'erro:42501'),
        jsonb_build_array('T08 terceiro nao ve a contratacao', v_ter, 'authenticated', 'select 1 from public.contratacoes where id = ' || v_id, 'ok:0'),
        jsonb_build_array('T09 visitante nao le mensagens', v_cli, 'anon', 'select 1 from public.mensagens where contratacao_id = ' || v_id, 'ok:0'),
        jsonb_build_array('T10 visitante nao envia', v_cli, 'anon', v_ins || quote_literal(v_cli) || ', ''x'')', 'erro:42501'),
        jsonb_build_array('T11 cliente nao envia como profissional', v_cli, 'authenticated', v_ins || quote_literal(v_pro) || ', ''x'')', 'erro:42501'),
        jsonb_build_array('T12 mensagem so com espacos e recusada', v_cli, 'authenticated', v_ins || quote_literal(v_cli) || ', ''     '')', 'erro:23514'),
        jsonb_build_array('T13 1000 caracteres e aceita', v_cli, 'authenticated', v_ins || quote_literal(v_cli) || ', repeat(''a'', 1000))', 'ok:1'),
        jsonb_build_array('T14 1001 caracteres e recusada', v_cli, 'authenticated', v_ins || quote_literal(v_cli) || ', repeat(''a'', 1001))', 'erro:23514'),
        jsonb_build_array('T15 autor nao edita mensagem', v_cli, 'authenticated', 'update public.mensagens set conteudo = ''editada'' where contratacao_id = ' || v_id, 'ok:0'),
        jsonb_build_array('T16 autor nao apaga mensagem', v_cli, 'authenticated', 'delete from public.mensagens where contratacao_id = ' || v_id, 'ok:0'),
        jsonb_build_array('T17 data forjada e aceita, mas trocada pela do servidor', v_cli, 'authenticated',
            'insert into public.mensagens (contratacao_id, autor_id, conteudo, created_at) values (' || v_id || ', ' || quote_literal(v_cli) || ', ''data forjada'', ''2000-01-01'')', 'ok:1')
    );

    for v_caso in select * from jsonb_array_elements(v_casos) loop
        v_obtido := pg_temp.tentar((v_caso->>1)::uuid, v_caso->>2, v_caso->>3);
        if v_obtido = v_caso->>4 then
            v_passou := v_passou + 1;
            v_relatorio := v_relatorio || E'\nPASSOU ' || (v_caso->>0);
        else
            v_falhou := v_falhou + 1;
            v_relatorio := v_relatorio || E'\nFALHOU ' || (v_caso->>0) || ' -> esperado ' || (v_caso->>4) || ', obtido ' || v_obtido;
        end if;
    end loop;

    if exists (select 1 from public.mensagens where contratacao_id = v_id and created_at < '2001-01-01') then
        v_falhou := v_falhou + 1;
        v_relatorio := v_relatorio || E'\nFALHOU T18 horario veio do cliente';
    else
        v_passou := v_passou + 1;
        v_relatorio := v_relatorio || E'\nPASSOU T18 horario sempre do servidor';
    end if;

    -- BR08: aceita continua aberta; os status finais só deixam ler
    foreach v_status in array array['aceita', 'recusada', 'cancelada', 'concluida'] loop
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_pro, 'teste status', 'Rua Teste', now() + interval '1 day')
        returning id into v_fim;

        insert into public.mensagens (contratacao_id, autor_id, conteudo) values (v_fim, v_cli, 'antes');

        if v_status = 'concluida' then
            update public.contratacoes set status = 'aceita' where id = v_fim;
        end if;
        update public.contratacoes set status = v_status where id = v_fim;

        v_obtido := pg_temp.tentar(v_pro, 'authenticated',
            'insert into public.mensagens (contratacao_id, autor_id, conteudo) values (' || v_fim || ', ' || quote_literal(v_pro) || ', ''depois'')');
        if v_obtido = (case when v_status = 'aceita' then 'ok:1' else 'erro:42501' end) then
            v_passou := v_passou + 1;
            v_relatorio := v_relatorio || E'\nPASSOU T19 envio em ' || v_status || ' (' || v_obtido || ')';
        else
            v_falhou := v_falhou + 1;
            v_relatorio := v_relatorio || E'\nFALHOU T19 envio em ' || v_status || ' -> obtido ' || v_obtido;
        end if;

        v_obtido := pg_temp.tentar(v_cli, 'authenticated', 'select 1 from public.mensagens where contratacao_id = ' || v_fim);
        if v_obtido = (case when v_status = 'aceita' then 'ok:2' else 'ok:1' end) then
            v_passou := v_passou + 1;
            v_relatorio := v_relatorio || E'\nPASSOU T20 historico visivel em ' || v_status;
        else
            v_falhou := v_falhou + 1;
            v_relatorio := v_relatorio || E'\nFALHOU T20 historico em ' || v_status || ' -> obtido ' || v_obtido;
        end if;
    end loop;

    raise exception E'RELATORIO (erro proposital: nada foi salvo)%\n% passaram, % falharam', v_relatorio, v_passou, v_falhou;
end;
$$;
