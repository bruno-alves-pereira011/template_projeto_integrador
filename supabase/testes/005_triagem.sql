-- TESTE 005_triagem.sql — US-016 (critérios 1, 3, 4, 5 e 6 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/005_triagem.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof1@, prof3@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_cat    bigint;
    v_res    jsonb;
    v_n      integer;
    v_m      integer;
    v_texto  text;
    v_linha  record;
    r        text := '';

    -- Descrição com 30+ caracteres e contato válido
    c_desc_ok constant text := 'Pintura interna e externa, textura e grafiato.';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof3@)';
    end if;

    -- Preparação como postgres: prof3 pendente com perfil completo
    select pc.categoria_id into v_cat from public.profissional_categoria pc where pc.profissional_id = v_p3 limit 1;
    update public.profissionais
       set status_aprovacao = 'pendente', cidade = 'Guarulhos', bairro = 'Jardim América',
           descricao = c_desc_ok, whatsapp = '5511977770003', telefone = null
     where id = v_p3;
    update public.categorias set ativa = true where id = v_cat;

    -- ============ telefone_br (BR13: DDD válido, 10/11 dígitos, celular com 9) ============
    r := r || case when public.telefone_br('(11) 97777-0001') = '11977770001'
                    and public.telefone_br('+55 11 97777-0001') = '11977770001'
                    and public.telefone_br('5511977770001') = '11977770001'
                    and public.telefone_br('(27) 3333-0001') = '2733330001'
                   then 'T1a ok (formatos aceitos)' else 'T1a FALHOU' end || E'\n';
    r := r || case when public.telefone_br('(00) 97777-0001') is null
                    and public.telefone_br('(20) 97777-0001') is null
                    and public.telefone_br('(11) 87777-0001') is null
                    and public.telefone_br('97777-0001') is null
                    and public.telefone_br('') is null
                    and public.telefone_br(null) is null
                   then 'T1b ok (DDD 00/20, celular sem 9, sem DDD e vazio recusados)' else 'T1b FALHOU' end || E'\n';

    -- ============ Critério 1/4: perfil completo → verde ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res ->> 'resultado' = 'verde' and jsonb_array_length(v_res -> 'pendencias') = 0
                   then 'T2 ok (perfil completo: verde)' else 'T2 FALHOU (' || v_res::text || ')' end || E'\n';

    select a.checagens into v_res from public.analises_profissional a
     where a.profissional_id = v_p3 and a.acao = 'triagem' order by a.created_at desc, a.id desc limit 1;
    r := r || case when jsonb_array_length(v_res) = 6
                    and not exists (select 1 from jsonb_array_elements(v_res) ch
                                    where ch ->> 'tipo' <> 'obrigatoria' or ch ->> 'mensagem' is null)
                   then 'T3 ok (6 checagens gravadas em analises_profissional)' else 'T3 FALHOU (' || coalesce(v_res::text, 'sem linha') || ')' end || E'\n';

    -- ============ BR12: triagem não muda o status ============
    select count(*) into v_n from public.profissionais where id = v_p3 and status_aprovacao = 'pendente';
    r := r || case when v_n = 1 then 'T4 ok (verde continua pendente)' else 'T4 FALHOU (status mudou)' end || E'\n';

    -- ============ Sem mudança no perfil → não grava de novo ============
    select count(*) into v_n from public.analises_profissional where profissional_id = v_p3 and acao = 'triagem';
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.solicitar_analise();
    perform public.solicitar_analise();
    execute 'reset role';
    select count(*) into v_m from public.analises_profissional where profissional_id = v_p3 and acao = 'triagem';
    r := r || case when v_m = v_n then 'T5 ok (salvar sem mudar nada não repete a triagem)' else 'T5 FALHOU (' || v_n || ' -> ' || v_m || ')' end || E'\n';

    -- ============ Critério 3/4: cada checagem que falha vira pendência com motivo ============
    -- Descrição curta (BDD "Pedro Pedreiro")
    update public.profissionais set descricao = 'Faço obra' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res ->> 'resultado' = 'pendencia'
                    and v_res -> 'pendencias' = '["Descrição com menos de 30 caracteres"]'::jsonb
                   then 'T6a ok (descrição curta: ' || (v_res -> 'pendencias' ->> 0) || ')' else 'T6a FALHOU (' || v_res::text || ')' end || E'\n';

    -- Corrige e salva de novo → verde
    update public.profissionais set descricao = c_desc_ok where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res ->> 'resultado' = 'verde' then 'T6b ok (corrigiu: verde de novo)' else 'T6b FALHOU (' || v_res::text || ')' end || E'\n';

    -- Bairro vazio
    update public.profissionais set bairro = '  ' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res -> 'pendencias' = '["Bairro não preenchido"]'::jsonb
                   then 'T6c ok (bairro vazio)' else 'T6c FALHOU (' || v_res::text || ')' end || E'\n';
    update public.profissionais set bairro = 'Jardim América' where id = v_p3;

    -- WhatsApp e telefone com DDD 00 → pendência; um deles válido → passa
    update public.profissionais set whatsapp = '(00) 97777-0003', telefone = '(00) 3333-0003' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res ->> 'resultado' = 'pendencia'
                    and (v_res -> 'pendencias' ->> 0) like 'WhatsApp e telefone sem DDD%'
                   then 'T6d ok (DDD 00 nos dois)' else 'T6d FALHOU (' || v_res::text || ')' end || E'\n';

    update public.profissionais set telefone = '(27) 3333-0003' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res ->> 'resultado' = 'verde' then 'T6e ok (telefone fixo válido basta)' else 'T6e FALHOU (' || v_res::text || ')' end || E'\n';
    update public.profissionais set whatsapp = '5511977770003', telefone = null where id = v_p3;

    -- Única categoria desativada (BR20)
    update public.categorias set ativa = false where id = v_cat;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_res -> 'pendencias' = '["Nenhuma categoria ativa selecionada"]'::jsonb
                   then 'T6f ok (categoria desativada não conta)' else 'T6f FALHOU (' || v_res::text || ')' end || E'\n';
    update public.categorias set ativa = true where id = v_cat;

    -- E-mail não confirmado (se o SQL Editor não puder alterar auth.users, só registra "pulado")
    begin
        update auth.users set email_confirmed_at = null where id = v_p3;
        perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
        v_res := public.solicitar_analise();
        execute 'reset role';
        r := r || case when v_res -> 'pendencias' = '["E-mail ainda não confirmado"]'::jsonb
                       then 'T6g ok (e-mail não confirmado)' else 'T6g FALHOU (' || v_res::text || ')' end || E'\n';
        update auth.users set email_confirmed_at = now() where id = v_p3;
    exception when insufficient_privilege then
        r := r || 'T6g pulado (sem permissão para alterar auth.users: ' || sqlerrm || ')' || E'\n';
    end;

    -- Várias falhas ao mesmo tempo → todas listadas
    update public.profissionais set descricao = null, cidade = '', bairro = null where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    r := r || case when jsonb_array_length(v_res -> 'pendencias') = 2
                    and v_res -> 'pendencias' ? 'Cidade e bairro não preenchidos'
                    and v_res -> 'pendencias' ? 'Descrição com menos de 30 caracteres'
                   then 'T6h ok (duas pendências listadas)' else 'T6h FALHOU (' || v_res::text || ')' end || E'\n';

    -- ============ Critério 5: a fila mostra o resultado e os motivos ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select f.triagem, f.triagem_motivos into v_linha from public.fila_analise() f where f.id = v_p3;
    execute 'reset role';
    r := r || case when v_linha.triagem = 'pendencia' and array_length(v_linha.triagem_motivos, 1) = 2
                   then 'T7a ok (fila: pendencia com 2 motivos)' else 'T7a FALHOU (' || coalesce(v_linha.triagem, 'null') || ')' end || E'\n';

    -- Pendência não entra no lote; depois de corrigir, entra
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select d.situacao into v_texto from public.decidir_profissionais(array[v_p3], 'aprovar', null, true) d;
    execute 'reset role';
    r := r || case when v_texto = 'ignorado' then 'T7b ok (pendência fora do lote)' else 'T7b FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    update public.profissionais set descricao = c_desc_ok, cidade = 'Guarulhos', bairro = 'Jardim América' where id = v_p3;
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.solicitar_analise();
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select d.situacao into v_texto from public.decidir_profissionais(array[v_p3], 'aprovar', null, true) d;
    execute 'reset role';
    r := r || case when v_texto = 'aprovado' then 'T7c ok (verde aprovado no lote)' else 'T7c FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    -- ============ Critério 6: ninguém grava resultado pelo app ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.analises_profissional (profissional_id, acao, resultado, checagens)
        values (v_p3, 'triagem', 'verde', '[]'::jsonb);
        r := r || 'T8a FALHOU (profissional gravou verde direto)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'T8a ok (insert direto recusado)' || E'\n';
    end;
    begin
        perform public.triar_profissional(v_p1);
        r := r || 'T8b FALHOU (profissional chamou a função interna)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'T8b ok (triar_profissional é interna)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.solicitar_analise();
        r := r || 'T8c FALHOU (cliente pediu análise)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'T8c ok (cliente: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        perform public.solicitar_analise();
        r := r || 'T8d FALHOU (visitante pediu análise)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'T8d ok (visitante sem execute)' || E'\n';
    end;
    execute 'reset role';

    -- Aprovado que salva o perfil: a triagem registra, o status não muda (BR18 é da US-021)
    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := public.solicitar_analise();
    execute 'reset role';
    select count(*) into v_n from public.profissionais where id = v_p1 and status_aprovacao = 'aprovado';
    r := r || case when v_n = 1 and v_res ? 'resultado' then 'T9 ok (prof1 aprovado continua aprovado: ' || (v_res ->> 'resultado') || ')'
                   else 'T9 FALHOU' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
