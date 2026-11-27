-- TESTE 014_privacidade_limites.sql — DEBT-010 (achados H2 e H3 da banca)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/014_privacidade_limites.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: cliente@, prof1@ e prof3@helpme.test.
-- Telefones do prof1 e do cliente são forçados aqui dentro (e desfeitos no final).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_texto  text;
    v_n      integer;
    r        text := '';
    c_tel_cadastro constant text := '(27) 99999-0001';
    c_tel_perfil   constant text := '(27) 3333-0001';
begin
    if v_cli is null or v_p1 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (cliente@, prof1@, prof3@)';
    end if;

    -- Preparação como postgres: prof1 aprovado com telefone de perfil diferente do cadastro.
    update public.profissionais set status_aprovacao = 'aprovado', telefone = c_tel_perfil where id = v_p1;
    update public.usuarios set telefone = c_tel_cadastro where id = v_p1;
    update public.profissionais set status_aprovacao = 'pendente' where id = v_p3;
    update public.usuarios set telefone = '(27) 98888-0002' where id = v_cli;

    -- ============ Visitante ============
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';

    select u.nome into v_texto from public.usuarios u where u.id = v_p1;
    r := r || case when v_texto is not null then 'P1 ok (visitante lê o nome do aprovado)' else 'P1 FALHOU (nome não veio)' end || E'\n';

    begin
        perform u.telefone from public.usuarios u where u.id = v_p1;
        r := r || 'P2 FALHOU (visitante leu usuarios.telefone)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P2 ok (usuarios.telefone fechado para visitante)' || E'\n';
    end;

    begin
        perform * from public.usuarios limit 1;
        r := r || 'P3 FALHOU (select * passou)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P3 ok (select * recusado)' || E'\n';
    end;

    select v.telefone into v_texto from public.profissionais_publicos v where v.id = v_p1;
    r := r || case when v_texto = c_tel_perfil then 'P4 ok (diretório mostra o telefone do perfil, não o do cadastro)'
                   else 'P4 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    select public.telefone_publico(v_p3) into v_texto;
    r := r || case when v_texto is null then 'P5 ok (telefone_publico de pendente é null)' else 'P5 FALHOU (' || v_texto || ')' end || E'\n';

    begin
        perform public.meu_telefone();
        r := r || 'P6 FALHOU (visitante chamou meu_telefone)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P6 ok (meu_telefone fechado para visitante)' || E'\n';
    end;
    execute 'reset role';

    -- Sem telefone no perfil, o diretório usa o do cadastro (como já era).
    update public.profissionais set telefone = null where id = v_p1;
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    select v.telefone into v_texto from public.profissionais_publicos v where v.id = v_p1;
    execute 'reset role';
    r := r || case when v_texto = c_tel_cadastro then 'P7 ok (sem telefone de perfil, mostra o do cadastro)'
                   else 'P7 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';
    update public.profissionais set telefone = c_tel_perfil where id = v_p1;

    -- ============ Cliente logado ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    begin
        perform u.telefone from public.usuarios u where u.id = v_p1;
        r := r || 'P8 FALHOU (cliente leu o telefone do cadastro do prof1)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'P8 ok (usuarios.telefone fechado para logado)' || E'\n';
    end;

    select count(*) into v_n from public.usuarios u where u.id = v_p1 and u.nome is not null and u.tipo_usuario = 'profissional';
    r := r || case when v_n = 1 then 'P9 ok (cliente lê nome e tipo do aprovado)' else 'P9 FALHOU (' || v_n || ')' end || E'\n';

    select public.meu_telefone() into v_texto;
    r := r || case when v_texto = '(27) 98888-0002' then 'P10 ok (dono lê o próprio telefone por meu_telefone)'
                   else 'P10 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    -- Mesmo update que meu-perfil.js faz (returning só nome).
    update public.usuarios set nome = 'Cliente Teste', telefone = '(27) 97777-0003'
     where id = v_cli returning nome into v_texto;
    r := r || case when v_texto = 'Cliente Teste' and public.meu_telefone() = '(27) 97777-0003'
                   then 'P11 ok (dono edita nome e telefone)' else 'P11 FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    -- ============ Limites de tamanho ============
    begin
        update public.usuarios set nome = repeat('a', 120) where id = v_cli;
        r := r || 'P12 ok (nome com 120 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P12 FALHOU (nome com 120 recusado)' || E'\n';
    end;

    begin
        update public.usuarios set nome = repeat('a', 121) where id = v_cli;
        r := r || 'P13 FALHOU (nome com 121 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P13 ok (nome com 121 recusado)' || E'\n';
    end;

    begin
        update public.usuarios set telefone = repeat('9', 21) where id = v_cli;
        r := r || 'P14 FALHOU (telefone com 21 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P14 ok (telefone com 21 recusado)' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, repeat('a', 1001), 'Rua A, 1', now() + interval '2 days');
        r := r || 'P15 FALHOU (descrição com 1001 aceita)' || E'\n';
    exception when check_violation then
        r := r || 'P15 ok (descrição da contratação com 1001 recusada)' || E'\n';
    when others then
        r := r || 'P15 FALHOU (outro erro: ' || sqlerrm || ')' || E'\n';
    end;

    begin
        insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
        values (v_cli, v_p1, 'Torneira vazando', repeat('a', 201), now() + interval '2 days');
        r := r || 'P16 FALHOU (endereço com 201 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P16 ok (endereço com 201 recusado)' || E'\n';
    when others then
        r := r || 'P16 FALHOU (outro erro: ' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.profissionais set descricao = repeat('a', 501) where id = v_p1;
        r := r || 'P17 FALHOU (descrição do perfil com 501 aceita)' || E'\n';
    exception when check_violation then
        r := r || 'P17 ok (descrição do perfil com 501 recusada)' || E'\n';
    end;

    begin
        update public.profissionais set cidade = repeat('a', 81) where id = v_p1;
        r := r || 'P18 FALHOU (cidade com 81 aceita)' || E'\n';
    exception when check_violation then
        r := r || 'P18 ok (cidade com 81 recusada)' || E'\n';
    end;

    begin
        update public.profissionais set whatsapp = repeat('9', 21) where id = v_p1;
        r := r || 'P19 FALHOU (WhatsApp com 21 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P19 ok (WhatsApp com 21 recusado)' || E'\n';
    end;
    execute 'reset role';

    -- Avaliações ainda não têm tela: confere a regra direto (vale para qualquer papel).
    begin
        insert into public.avaliacoes (usuario_id, profissional_id, nota, comentario)
        values (v_p3, v_p1, 5, repeat('a', 501));
        r := r || 'P20 FALHOU (comentário com 501 aceito)' || E'\n';
    exception when check_violation then
        r := r || 'P20 ok (comentário com 501 recusado)' || E'\n';
    when unique_violation then
        r := r || 'P20 FALHOU (prof3 já avaliou o prof1: escolha outro par)' || E'\n';
    end;

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
