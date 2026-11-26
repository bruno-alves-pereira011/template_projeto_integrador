-- TESTE 013_categorias_admin.sql — US-018 (critérios 2, 3, 4, 5 e 8 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/013_categorias_admin.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@ e prof1@helpme.test.
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_cat    bigint;
    v_vinc   bigint;
    v_n      integer;
    v_texto  text;
    r        text := '';
begin
    if v_admin is null or v_cli is null or v_p1 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@)';
    end if;
    select pc.categoria_id into v_vinc from public.profissional_categoria pc where pc.profissional_id = v_p1 limit 1;
    if v_vinc is null then
        raise exception 'RELATORIO: prof1 sem categoria vinculada';
    end if;

    -- ============ Critério 2: admin cria e edita ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    insert into public.categorias (slug, nome, descricao, sigla, cor)
    values ('jardineiro', 'Jardineiro', 'Poda, plantio e manutenção de jardins.', 'JD', '#2f7d32')
    returning id into v_cat;
    r := r || case when v_cat is not null then 'G1 ok (admin criou "Jardineiro")' else 'G1 FALHOU' end || E'\n';

    update public.categorias set nome = 'Jardinagem', cor = '#1b5e20' where id = v_cat;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'G2 ok (admin editou)' else 'G2 FALHOU (' || v_n || ')' end || E'\n';

    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('jardineiro', 'Outro', 'OT', '#000000');
        r := r || 'G3 FALHOU (slug repetido aceito)' || E'\n';
    exception when unique_violation then
        r := r || 'G3 ok (slug repetido recusado)' || E'\n';
    end;

    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('marceneiro', 'Marceneiro', 'MC', 'verde');
        r := r || 'G4 FALHOU (cor inválida aceita)' || E'\n';
    exception when check_violation then
        r := r || 'G4 ok (cor fora de #RRGGBB recusada)' || E'\n';
    end;

    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('Marceneiro Fino', 'Marceneiro', 'MC', '#5d4037');
        r := r || 'G5 FALHOU (slug com espaço/maiúscula aceito)' || E'\n';
    exception when check_violation then
        r := r || 'G5 ok (slug fora do formato recusado)' || E'\n';
    end;

    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('marceneiro', 'Marceneiro', 'mcx1', '#5d4037');
        r := r || 'G6 FALHOU (sigla inválida aceita)' || E'\n';
    exception when check_violation then
        r := r || 'G6 ok (sigla fora do formato recusada)' || E'\n';
    end;

    begin
        insert into public.categorias (id, slug, nome, sigla, cor) values (99999, 'marceneiro', 'Marceneiro', 'MC', '#5d4037');
        r := r || 'G7 FALHOU (admin escolheu o id)' || E'\n';
    exception when insufficient_privilege or generated_always then
        r := r || 'G7 ok (id não é escolhido pelo app)' || E'\n';
    end;

    -- ============ Critério 3: desativa, reativa, nunca apaga ============
    update public.categorias set ativa = false where id = v_vinc;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 1 then 'G8 ok (admin desativou a categoria do prof1)' else 'G8 FALHOU' end || E'\n';

    begin
        delete from public.categorias where id = v_cat;
        r := r || 'G9 FALHOU (admin apagou categoria)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'G9 ok (apagar é recusado até para o admin)' || E'\n';
    end;
    execute 'reset role';

    -- ============ Critério 4: vínculos mantidos; triagem só conta ativa ============
    select count(*) into v_n from public.profissional_categoria where profissional_id = v_p1 and categoria_id = v_vinc;
    r := r || case when v_n = 1 then 'G10 ok (vínculo do prof1 mantido)' else 'G10 FALHOU' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    select count(*) into v_n from public.categorias where id = v_vinc and not ativa;
    execute 'reset role';
    r := r || case when v_n = 1 then 'G11 ok (visitante lê a situação para filtrar)' else 'G11 FALHOU' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.categorias set ativa = true where id = v_vinc;
    get diagnostics v_n = row_count;
    execute 'reset role';
    r := r || case when v_n = 1 and (select ativa from public.categorias where id = v_vinc)
                   then 'G12 ok (admin reativou)' else 'G12 FALHOU' end || E'\n';

    -- ============ Critério 5: cliente e profissional não escrevem ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('golpe', 'Golpe', 'GP', '#000000');
        r := r || 'G13 FALHOU (cliente criou categoria)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'G13 ok (cliente não cria: ' || sqlerrm || ')' || E'\n';
    end;
    update public.categorias set nome = 'Hackeado' where id = v_cat;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 0 then 'G14 ok (cliente não edita: nenhuma linha)' else 'G14 FALHOU' end || E'\n';
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.categorias set ativa = false where id = v_vinc;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 0 then 'G15 ok (profissional não desativa: nenhuma linha)' else 'G15 FALHOU' end || E'\n';
    begin
        delete from public.categorias where id = v_vinc;
        r := r || 'G16 FALHOU (profissional apagou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'G16 ok (profissional não apaga)' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
        insert into public.categorias (slug, nome, sigla, cor) values ('anonimo', 'Anônimo', 'AN', '#000000');
        r := r || 'G17 FALHOU (visitante criou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'G17 ok (visitante não cria)' || E'\n';
    end;
    execute 'reset role';

    select nome into v_texto from public.categorias where id = v_cat;
    r := r || case when v_texto = 'Jardinagem' then 'G18 ok (nada mudou depois das tentativas)' else 'G18 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
