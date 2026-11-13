-- TESTE 003_admin.sql — US-014, critérios 1, 4 e 5 (NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/003_admin.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Precisa das contas do seed: cliente@helpme.test e prof3@helpme.test
-- (o prof3 é colocado como 'pendente' dentro do teste, se não estiver).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_prof   uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_novo   uuid := gen_random_uuid();
    v_n      integer;
    v_bool   boolean;
    v_texto  text;
    r        text := '';
begin
    -- Para agir como usuário do app: request.jwt.claims (auth.uid()) + set local role authenticated.
    -- "reset role" volta a ser postgres (o SQL Editor), que é quem cadastra admin (A09).
    if v_cli is null or v_prof is null then
        raise exception 'RELATORIO: contas do seed (cliente@, prof3@) não encontradas';
    end if;

    -- Preparação como postgres: prof3 pendente
    update public.profissionais set status_aprovacao = 'pendente' where id = v_prof;

    -- ===================== Critério 1 =====================
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select public.eh_admin() into v_bool;
    r := r || case when v_bool = false then 'C1a ok (cliente: eh_admin = false)' else 'C1a FALHOU' end || E'\n';

    begin
        insert into public.administradores (usuario_id) values (v_cli);
        r := r || 'C1b FALHOU (cliente se tornou admin)' || E'\n';
    exception when others then
        r := r || 'C1b ok (insert recusado: ' || sqlerrm || ')' || E'\n';
    end;

    begin
        select count(*) into v_n from public.administradores;
        r := r || 'C1c FALHOU (cliente leu administradores: ' || v_n || ' linhas)' || E'\n';
    exception when others then
        r := r || 'C1c ok (leitura recusada: ' || sqlerrm || ')' || E'\n';
    end;

    -- Como postgres (SQL Editor): cadastra o cliente como admin
    execute 'reset role';
    insert into public.administradores (usuario_id) values (v_cli);

    execute 'set local role authenticated';
    select public.eh_admin() into v_bool;
    r := r || case when v_bool then 'C1d ok (admin: eh_admin = true)' else 'C1d FALHOU' end || E'\n';

    begin
        delete from public.administradores where usuario_id = v_cli;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 0 then 'C1e ok (admin não se remove pelo app)' else 'C1e FALHOU' end || E'\n';
    exception when others then
        r := r || 'C1e ok (delete recusado: ' || sqlerrm || ')' || E'\n';
    end;

    -- Visitante (anon)
    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    select public.eh_admin() into v_bool;
    r := r || case when v_bool = false then 'C1f ok (visitante: eh_admin = false)' else 'C1f FALHOU' end || E'\n';
    execute 'reset role';
    delete from public.administradores where usuario_id = v_cli;

    -- ===================== Critério 4 =====================
    -- Simula o signUp do Auth com tipo_usuario = 'admin' nos metadados
    insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (v_novo, 'teste-003-' || left(v_novo::text, 8) || '@helpme.test',
            json_build_object('nome', 'Quero Ser Admin', 'tipo_usuario', 'admin')::jsonb,
            'authenticated', 'authenticated');

    select tipo_usuario into v_texto from public.usuarios where id = v_novo;
    r := r || case when v_texto = 'cliente' then 'C4a ok (virou cliente)' else 'C4a FALHOU (' || coalesce(v_texto, 'sem linha') || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_novo, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select public.eh_admin() into v_bool;
    r := r || case when v_bool = false then 'C4b ok (sem acesso admin)' else 'C4b FALHOU' end || E'\n';
    execute 'reset role';

    -- ===================== Critério 5 =====================
    perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.profissionais set status_aprovacao = 'aprovado' where id = v_prof;
        r := r || 'C5a FALHOU (profissional se aprovou)' || E'\n';
    exception when others then
        r := r || 'C5a ok (profissional barrado: ' || sqlerrm || ')' || E'\n';
    end;
    select status_aprovacao into v_texto from public.profissionais where id = v_prof;
    r := r || case when v_texto = 'pendente' then 'C5b ok (continua pendente)' else 'C5b FALHOU (' || v_texto || ')' end || E'\n';

    -- Mesmo usuário, agora administrador: o trigger aceita a mudança.
    -- (O RLS de hoje só deixa cada um editar a própria linha; as políticas
    -- e funções de decisão sobre outros profissionais vêm na US-015.)
    execute 'reset role';
    insert into public.administradores (usuario_id) values (v_prof);
    execute 'set local role authenticated';
    begin
        update public.profissionais set status_aprovacao = 'aprovado' where id = v_prof;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 1 then 'C5c ok (admin muda o status)' else 'C5c FALHOU (' || v_n || ' linhas)' end || E'\n';
    exception when others then
        r := r || 'C5c FALHOU (' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    raise exception E'RELATORIO:\n%', r;
end $$;
