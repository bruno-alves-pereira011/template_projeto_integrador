-- TESTE US-012 — Meu perfil do cliente (MP-08 e MP-09 de docs/tasks/breakdown_US-012.md)
-- Rodar no SQL Editor do Supabase. NÃO grava nada: o bloco termina com raise exception,
-- o Postgres desfaz tudo e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Usa as contas do seed: cliente@helpme.test e prof1@helpme.test (aprovado).
-- Esperado:
--   MP-08 ok   -> cliente não troca o próprio tipo_usuario (trigger proteger_usuario)
--   RLS ok     -> cliente não altera a linha de outra pessoa (0 linhas)
--   MP-09 ok   -> depois do aceite, contato_contraparte devolve ao profissional o telefone novo do cliente

do $$
declare
    v_cli  uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_prof uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_id   bigint;
    v_tel  text;
    v_n    integer;
    r      text := '';
begin
    if v_cli is null or v_prof is null then
        raise exception 'RELATORIO: contas do seed não encontradas';
    end if;

    -- Age como o cliente, pela API (papel authenticated + RLS)
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    -- MP-08: trocar o próprio tipo_usuario
    begin
        update public.usuarios set tipo_usuario = 'profissional' where id = v_cli;
        r := r || 'MP-08 FALHOU (tipo alterado) | ';
    exception when others then
        r := r || 'MP-08 ok (' || sqlerrm || ') | ';
    end;

    -- RLS: alterar a linha de outra pessoa
    update public.usuarios set nome = 'intruso' where id = v_prof;
    get diagnostics v_n = row_count;
    r := r || case when v_n = 0 then 'RLS ok (0 linhas em outro usuário)' else 'RLS FALHOU (' || v_n || ' linhas)' end || ' | ';

    -- Cliente muda o telefone (o que meu-perfil.html faz) e contrata o prof1
    update public.usuarios set telefone = '(27) 99999-1234' where id = v_cli;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
    values (v_cli, v_prof, '[TESTE US-012] telefone novo', 'Rua de teste, 1', now() + interval '1 day')
    returning id into v_id;

    -- Profissional: antes do aceite não vê o telefone; depois vê o novo
    perform set_config('request.jwt.claims', json_build_object('sub', v_prof, 'role', 'authenticated')::text, true);
    select telefone into v_tel from public.contato_contraparte(v_id);
    r := r || 'antes do aceite: ' || coalesce(v_tel, 'null') || ' | ';

    update public.contratacoes set status = 'aceita' where id = v_id;
    select telefone into v_tel from public.contato_contraparte(v_id);
    r := r || case when v_tel = '(27) 99999-1234' then 'MP-09 ok' else 'MP-09 FALHOU' end
            || ' (depois do aceite: ' || coalesce(v_tel, 'null') || ')';

    raise exception 'RELATORIO: %', r;
end $$;
