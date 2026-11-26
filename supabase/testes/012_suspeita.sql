-- TESTE 012_suspeita.sql — US-021 (critérios 1 a 5 e 8 no banco; NFR11)
-- Rodar no SQL Editor DEPOIS de aplicar supabase/migrations/012_suspeita.sql.
-- NÃO grava nada: o bloco termina com raise exception, o Postgres desfaz tudo
-- e o relatório volta na mensagem de erro ("RELATORIO: ...").
-- Contas usadas: admin@helpme.test, cliente@, prof1@, prof2@ e prof3@helpme.test.
-- Status, telefones e descrições são forçados aqui dentro (e desfeitos no final).
-- Resultado esperado: todas as linhas com "ok" e nenhuma com "FALHOU".

do $$
declare
    v_admin  uuid := (select id from auth.users where email = 'admin@helpme.test');
    v_cli    uuid := (select id from auth.users where email = 'cliente@helpme.test');
    v_p1     uuid := (select id from auth.users where email = 'prof1@helpme.test');
    v_p2     uuid := (select id from auth.users where email = 'prof2@helpme.test');
    v_p3     uuid := (select id from auth.users where email = 'prof3@helpme.test');
    v_nome1  text;
    v_n      integer;
    v_texto  text;
    v_json   jsonb;
    v_linha  record;
    v_contr  bigint;
    r        text := '';
    c_desc_ok constant text := 'Pintura interna e externa, textura e grafiato.';
    c_motivo  constant text := 'Fotos de outro profissional no perfil.';
begin
    if v_admin is null or v_cli is null or v_p1 is null or v_p2 is null or v_p3 is null then
        raise exception 'RELATORIO: contas de teste não encontradas (admin@, cliente@, prof1@, prof2@, prof3@)';
    end if;
    select nome into v_nome1 from public.usuarios where id = v_p1;

    -- Preparação como postgres: três perfis completos, números diferentes,
    -- prof3 é o cadastro mais novo (created_at = agora).
    update public.profissionais
       set cidade = 'Guarulhos', bairro = 'Jardim América', descricao = c_desc_ok, telefone = null,
           whatsapp = case id when v_p1 then '5511977770001' when v_p2 then '5511977770002' else '5527999990003' end,
           status_aprovacao = case when id = v_p3 then 'pendente' else 'aprovado' end
     where id in (v_p1, v_p2, v_p3);
    update public.profissionais set created_at = now() where id = v_p3;
    update public.categorias set ativa = true
     where id in (select pc.categoria_id from public.profissional_categoria pc where pc.profissional_id in (v_p1, v_p2, v_p3));

    -- ============ Linha de base: sem sinais → verde ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_json ->> 'resultado' = 'verde' and v_json ->> 'status' = 'pendente'
                   then 'U0 ok (perfil limpo: verde, status devolvido)' else 'U0 FALHOU (' || v_json::text || ')' end || E'\n';

    -- ============ Critério 1: telefone igual ao de outro ============
    update public.profissionais set whatsapp = '(11) 97777-0001' where id = v_p3;   -- mesmo número do prof1, outro formato
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_json ->> 'resultado' = 'em_analise' and jsonb_array_length(v_json -> 'pendencias') = 0
                   then 'U1a ok (suspeito volta como em_analise, sem revelar o sinal)' else 'U1a FALHOU (' || v_json::text || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.detalhe_profissional_admin(v_p3);
    execute 'reset role';
    select ch into v_json from jsonb_array_elements(v_json -> 'triagem' -> 'checagens') ch where ch ->> 'codigo' = 'telefone_repetido';
    r := r || case when (v_json ->> 'ok')::boolean = false and v_json ->> 'mensagem' like '%' || v_nome1 || '%'
                    and v_json ->> 'outro_id' = v_p1::text
                   then 'U1b ok (detalhe do admin: ' || (v_json ->> 'mensagem') || ')' else 'U1b FALHOU (' || coalesce(v_json::text, 'null') || ')' end || E'\n';

    -- O cadastro mais antigo não é marcado pelo número que copiaram dele.
    v_json := public.triar_profissional(v_p1);
    r := r || case when exists (select 1 from jsonb_array_elements(v_json -> 'checagens') ch
                                where ch ->> 'codigo' = 'telefone_repetido' and (ch ->> 'ok')::boolean)
                   then 'U1c ok (prof1, o mais antigo, não é marcado)' else 'U1c FALHOU' end || E'\n';
    update public.profissionais set whatsapp = '5527999990003' where id = v_p3;

    -- ============ Critério 2: descrição ============
    update public.profissionais set descricao = c_desc_ok || ' Veja www.meusite.com' where id = v_p3;
    v_json := public.triar_profissional(v_p3);
    r := r || case when v_json ->> 'resultado' = 'suspeito'
                    and exists (select 1 from jsonb_array_elements(v_json -> 'checagens') ch
                                where ch ->> 'codigo' = 'descricao_link' and not (ch ->> 'ok')::boolean)
                   then 'U2a ok (link na descrição: suspeito)' else 'U2a FALHOU (' || (v_json ->> 'resultado') || ')' end || E'\n';

    update public.profissionais set descricao = c_desc_ok || ' Ligue (11) 98888-7777.' where id = v_p3;
    v_json := public.triar_profissional(v_p3);
    r := r || case when v_json ->> 'resultado' = 'suspeito' then 'U2b ok (telefone na descrição: suspeito)' else 'U2b FALHOU' end || E'\n';

    update public.profissionais set descricao = c_desc_ok || ' Só com PIX antecipado.' where id = v_p3;
    v_json := public.triar_profissional(v_p3);
    select ch ->> 'mensagem' into v_texto from jsonb_array_elements(v_json -> 'checagens') ch where ch ->> 'codigo' = 'descricao_termo';
    r := r || case when v_json ->> 'resultado' = 'suspeito' and v_texto like '%pix antecipado%'
                   then 'U2c ok (termo bloqueado: ' || v_texto || ')' else 'U2c FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    update public.profissionais set descricao = c_desc_ok || ' Rua 12, casa 3.' where id = v_p3;
    v_json := public.triar_profissional(v_p3);
    r := r || case when v_json ->> 'resultado' = 'verde' then 'U2d ok ("Rua 12, casa 3" não dispara)' else 'U2d FALHOU (' || (v_json ->> 'resultado') || ')' end || E'\n';

    -- ============ Critério 5: suspeito fica fora do lote e destacado na fila ============
    update public.profissionais set descricao = c_desc_ok || ' Veja www.meusite.com' where id = v_p3;
    perform public.triar_profissional(v_p3);
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select f.triagem into v_texto from public.fila_analise() f where f.id = v_p3;
    r := r || case when v_texto = 'suspeito' then 'U5a ok (fila: suspeito)' else 'U5a FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'aprovar', null, true);
    execute 'reset role';
    r := r || case when v_linha.situacao = 'ignorado' and v_linha.detalhe = 'Triagem: suspeito'
                   then 'U5b ok (lote ignora suspeito)' else 'U5b FALHOU (' || coalesce(v_linha.situacao, 'null') || ')' end || E'\n';

    -- ============ Critério 3: já recusado e reenviou ============
    update public.profissionais set descricao = c_desc_ok where id = v_p3;
    perform public.triar_profissional(v_p3);
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform * from public.decidir_profissionais(array[v_p3], 'recusar', c_motivo);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.reenviar_para_analise();
    execute 'reset role';
    select a.resultado, a.checagens into v_texto, v_json
      from public.analises_profissional a where a.profissional_id = v_p3 and a.acao = 'triagem'
     order by a.created_at desc, a.id desc limit 1;
    r := r || case when v_texto = 'suspeito'
                    and exists (select 1 from jsonb_array_elements(v_json) ch where ch ->> 'codigo' = 'ja_recusado' and not (ch ->> 'ok')::boolean)
                   then 'U3a ok (reenviou depois de recusado: suspeito)' else 'U3a FALHOU (' || coalesce(v_texto, 'null') || ')' end || E'\n';

    -- Aprovação humana posterior resolve o sinal.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select * into v_linha from public.decidir_profissionais(array[v_p3], 'aprovar');
    execute 'reset role';
    v_json := public.triar_profissional(v_p3);
    r := r || case when v_linha.situacao = 'aprovado' and v_json ->> 'resultado' = 'verde'
                   then 'U3b ok (aprovado de novo: sinal resolvido)' else 'U3b FALHOU (' || coalesce(v_linha.situacao, '') || ' / ' || (v_json ->> 'resultado') || ')' end || E'\n';

    -- ============ Critério 4: aprovado edita com alerta (BR18) ============
    alter table public.contratacoes disable trigger user;
    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada, status)
    values (v_cli, v_p1, 'Teste BR18', 'Rua Teste, 3', now() + interval '1 day', 'aceita')
    returning id into v_contr;
    alter table public.contratacoes enable trigger user;
    perform public.triar_profissional(v_p1);   -- triagem verde de referência

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.profissionais set descricao = c_desc_ok || ' Site: www.meusite.com' where id = v_p1;  -- sem chamar solicitar_analise
    execute 'reset role';
    select status_aprovacao into v_texto from public.profissionais where id = v_p1;
    r := r || case when v_texto = 'pendente' then 'U4a ok (aprovado editou com link pela API: voltou a pendente)' else 'U4a FALHOU (' || v_texto || ')' end || E'\n';

    select count(*) into v_n from public.profissionais_publicos where id = v_p1;
    r := r || case when v_n = 0 then 'U4b ok (saiu do diretório)' else 'U4b FALHOU' end || E'\n';

    select count(*) into v_n from public.analises_profissional
     where profissional_id = v_p1 and acao = 'reenvio' and autor_id is null and created_at = now();
    r := r || case when v_n = 1 then 'U4c ok (histórico: reenvio do sistema)' else 'U4c FALHOU (' || v_n || ')' end || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        update public.contratacoes set status = 'concluida' where id = v_contr;
        get diagnostics v_n = row_count;
        r := r || case when v_n = 1 then 'U4d ok (cliente concluiu a aceita)' else 'U4d FALHOU (nenhuma linha)' end || E'\n';
    exception when others then
        r := r || 'U4d FALHOU (' || sqlerrm || ')' || E'\n';
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_json := public.solicitar_analise();
    execute 'reset role';
    r := r || case when v_json ->> 'status' = 'pendente' and v_json ->> 'resultado' = 'em_analise'
                   then 'U4e ok (tela recebe status pendente, sem o sinal)' else 'U4e FALHOU (' || v_json::text || ')' end || E'\n';

    -- Edição limpa não tira do diretório.
    perform public.triar_profissional(v_p2);
    perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.profissionais set descricao = c_desc_ok || ' Atendo aos sábados.' where id = v_p2;
    execute 'reset role';
    r := r || case when (select status_aprovacao from public.profissionais where id = v_p2) = 'aprovado'
                   then 'U4f ok (edição sem alerta: continua aprovado)' else 'U4f FALHOU' end || E'\n';

    -- Sinal que já existia quando o admin aprovou não tira do diretório de novo.
    update public.profissionais set descricao = c_desc_ok || ' www.meusite.com' where id = v_p2;  -- como postgres: sem trigger
    perform public.triar_profissional(v_p2);
    perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.profissionais set bairro = 'Centro' where id = v_p2;
    execute 'reset role';
    r := r || case when (select status_aprovacao from public.profissionais where id = v_p2) = 'aprovado'
                   then 'U4g ok (mesmo sinal de antes: continua aprovado)' else 'U4g FALHOU' end || E'\n';

    -- Suspenso não é tocado (US-019).
    update public.profissionais set status_aprovacao = 'suspenso', descricao = c_desc_ok where id = v_p2;
    perform public.triar_profissional(v_p2);
    perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.profissionais set descricao = c_desc_ok || ' Ligue (11) 98888-7777.' where id = v_p2;
    perform public.solicitar_analise();
    execute 'reset role';
    r := r || case when (select status_aprovacao from public.profissionais where id = v_p2) = 'suspenso'
                   then 'U4h ok (suspenso continua suspenso)' else 'U4h FALHOU' end || E'\n';

    -- ============ Critério 8: funções internas fechadas ============
    perform set_config('request.jwt.claims', json_build_object('sub', v_p3, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
        perform public.termos_bloqueados();
        r := r || 'U8a FALHOU (profissional leu a lista de bloqueio)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'U8a ok (lista de bloqueio fechada)' || E'\n';
    end;
    begin
        perform public.reavaliar_profissional(v_p1);
        r := r || 'U8b FALHOU (profissional reavaliou outro)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'U8b ok (reavaliar_profissional fechada)' || E'\n';
    end;
    begin
        perform public.checagens_suspeita(v_p1);
        r := r || 'U8c FALHOU (profissional leu sinais de outro)' || E'\n';
    exception when insufficient_privilege then
        r := r || 'U8c ok (checagens_suspeita fechada)' || E'\n';
    end;
    execute 'reset role';

    raise exception 'RELATORIO:%', E'\n' || r;
end;
$$;
