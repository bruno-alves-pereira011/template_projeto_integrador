-- =====================================================================
-- HelpMe — 012: sinais de suspeita e reanálise de aprovados (US-021)
-- Requisitos: BR12, BR14, BR15, BR17, BR18, A07. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. termos_bloqueados(): lista de bloqueio (A07). Editável por SQL:
--      "create or replace" com a lista nova; a próxima triagem já usa.
--   2. sinais_descricao(texto): link, e-mail, 8+ dígitos e termo bloqueado.
--   3. checagens_suspeita(id): os sinais do tipo 'suspeita' (BR14):
--        telefone_repetido  WhatsApp/telefone igual ao de um profissional
--                           cadastrado ANTES (guarda outro_id e o nome);
--        descricao_*        os quatro sinais da descrição;
--        ja_recusado        recusa que nenhuma aprovação posterior resolveu.
--   4. triar_profissional(id): igual à 005, com os sinais de suspeita.
--   5. reavaliar_profissional(id): triagem + BR18. Aprovado cuja triagem
--      ganhou um problema NOVO (pendência ou suspeita que a triagem anterior
--      não tinha) volta para 'pendente' e sai do diretório. O histórico
--      registra um 'reenvio' do sistema (autor nulo), e a fila conta o
--      tempo a partir dele.
--   6. solicitar_analise(): passa a usar reavaliar_profissional e devolve
--      também o status (a tela avisa quem saiu do diretório).
--   7. Trigger profissionais_reavaliar_aprovado: aprovado que edita o perfil
--      pela API é reavaliado mesmo sem chamar solicitar_analise() (a regra
--      não depende do front).
--
-- DECISÕES (registradas em docs/tasks/breakdown_US-021.md):
--   - Telefone repetido só marca o cadastro MAIS NOVO: quem já estava no
--     diretório não sai porque alguém copiou o número dele.
--   - "Já recusado" deixa de valer depois que um admin aprova de novo.
--   - BR18 só age com problema NOVO: um aprovado que o admin aprovou mesmo
--     com um sinal não sai do diretório a cada edição por causa do mesmo sinal.
--   - Suspenso não é tocado (US-019). Contratações aceitas continuam (BR06).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 011. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho (inclusive os
-- exemplos da BR14, como "Rua 12, casa 3" não disparar).
-- =====================================================================

do $$
begin
    if to_regprocedure('public.reenviar_para_analise()') is null
       or to_regprocedure('public.triar_profissional(uuid)') is null then
        raise exception '012: aplique antes a 005_triagem.sql e a 010_reenvio.sql';
    end if;
end;
$$;


-- 1. Lista de bloqueio (A07) ---------------------------------------------------
-- Termos em minúsculas e SEM acento (a descrição é comparada sem acento).
-- Casam como palavra inteira. Para mudar: rode este bloco com a lista nova.
-- stable (não immutable): uma lista editada vale já na próxima triagem, sem
-- ficar presa em plano guardado de sessão aberta.
create or replace function public.termos_bloqueados()
returns text[]
language sql
stable
set search_path = public
as $$
    select array[
        'pix antecipado',
        'pagamento antecipado',
        'deposito antecipado',
        'adiantamento',
        'renda extra',
        'ganhe dinheiro',
        'investimento',
        'telegram'
    ];
$$;

comment on function public.termos_bloqueados() is
    'A07: lista de bloqueio da triagem (US-021). Minúsculas, sem acento. Edite com create or replace.';


-- 2. Sinais na descrição ---------------------------------------------------------
-- Minúsculas e sem acento antes de comparar.
create or replace function public.texto_sem_acento(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
    select translate(lower(coalesce(p_texto, '')),
                     'áàâãäéèêëíìîïóòôõöúùûüç',
                     'aaaaaeeeeiiiiooooouuuuc');
$$;

-- Devolve as 4 checagens de descrição (tipo 'suspeita').
--   link:     http(s)://, www. ou domínio com final comum (.com, .br, wa.me ...)
--   e-mail:   algo@dominio.ext
--   dígitos:  8+ dígitos com no máximo 2 separadores ( .()/- ) entre eles,
--             ex.: "(11) 98888-7777". "Rua 12, casa 3" não dispara.
--   termo:    palavra/expressão de termos_bloqueados()
create or replace function public.sinais_descricao(p_descricao text)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
    v_desc    text := public.texto_sem_acento(p_descricao);
    v_link    boolean;
    v_email   boolean;
    v_digitos boolean;
    v_termos  text[];
begin
    v_link := v_desc ~ '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|br|info|io|me|app|link|site|online|store|shop|ly|gl)\M)';
    v_email := v_desc ~ '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+';
    v_digitos := v_desc ~ '[0-9]([ .()/-]{0,2}[0-9]){7,}';

    select coalesce(array_agg(t order by t), '{}') into v_termos
    from unnest(public.termos_bloqueados()) t
    where v_desc ~ ('\m' || regexp_replace(t, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '\M');

    return jsonb_build_array(
        jsonb_build_object('codigo', 'descricao_link', 'tipo', 'suspeita', 'ok', not v_link,
            'mensagem', case when v_link then 'Descrição com link' else 'Descrição sem link' end),
        jsonb_build_object('codigo', 'descricao_email', 'tipo', 'suspeita', 'ok', not v_email,
            'mensagem', case when v_email then 'Descrição com e-mail' else 'Descrição sem e-mail' end),
        jsonb_build_object('codigo', 'descricao_telefone', 'tipo', 'suspeita', 'ok', not v_digitos,
            'mensagem', case when v_digitos then 'Descrição com sequência de 8 ou mais dígitos (telefone?)'
                             else 'Descrição sem telefone embutido' end),
        jsonb_build_object('codigo', 'descricao_termo', 'tipo', 'suspeita', 'ok', cardinality(v_termos) = 0,
            'mensagem', case when cardinality(v_termos) > 0
                             then 'Descrição com termo da lista de bloqueio: ' || array_to_string(v_termos, ', ')
                             else 'Descrição sem termos da lista de bloqueio' end)
    );
end;
$$;


-- 3. Sinais de suspeita do cadastro --------------------------------------------------
create or replace function public.checagens_suspeita(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_p          public.profissionais%rowtype;
    v_tels       text[];
    v_outro_id   uuid;
    v_outro_nome text;
    v_recusado   boolean;
begin
    select * into v_p from public.profissionais where id = p_id;
    if not found then
        return '[]'::jsonb;
    end if;

    v_tels := array_remove(array[public.telefone_br(v_p.whatsapp), public.telefone_br(v_p.telefone)], null);

    -- Só cadastros ANTERIORES: o mais novo é quem copiou.
    if cardinality(v_tels) > 0 then
        select o.id, u.nome into v_outro_id, v_outro_nome
        from public.profissionais o
        join public.usuarios u on u.id = o.id
        where o.id <> p_id
          and (o.created_at, o.id) < (v_p.created_at, v_p.id)
          and (public.telefone_br(o.whatsapp) = any (v_tels) or public.telefone_br(o.telefone) = any (v_tels))
        order by o.created_at, o.id
        limit 1;
    end if;

    -- Recusa que nenhuma aprovação posterior resolveu (ids crescem com o tempo).
    select exists (
        select 1 from public.analises_profissional r
        where r.profissional_id = p_id and r.acao = 'recusa'
          and r.id > coalesce((select max(a.id) from public.analises_profissional a
                               where a.profissional_id = p_id and a.acao = 'aprovacao'), 0)
    ) into v_recusado;

    return jsonb_build_array(
        case when v_outro_id is null then
            jsonb_build_object('codigo', 'telefone_repetido', 'tipo', 'suspeita', 'ok', true,
                'mensagem', 'WhatsApp e telefone sem repetição em cadastro anterior')
        else
            jsonb_build_object('codigo', 'telefone_repetido', 'tipo', 'suspeita', 'ok', false,
                'mensagem', 'WhatsApp ou telefone igual ao de ' || coalesce(v_outro_nome, 'outro profissional') || ' (cadastro anterior)',
                'outro_id', v_outro_id)
        end
    )
    || public.sinais_descricao(v_p.descricao)
    || jsonb_build_array(
        jsonb_build_object('codigo', 'ja_recusado', 'tipo', 'suspeita', 'ok', not v_recusado,
            'mensagem', case when v_recusado then 'Já foi recusado antes (reenviou o cadastro)'
                             else 'Sem recusa anterior a revisar' end));
end;
$$;


-- 4. Triagem (igual à 005, com os sinais de suspeita) -------------------------------
create or replace function public.triar_profissional(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_p           public.profissionais%rowtype;
    v_confirmado  boolean;
    v_categorias  integer;
    v_checagens   jsonb;
    v_resultado   text;
    v_ult_res     text;
    v_ult_chec    jsonb;
begin
    select * into v_p from public.profissionais where id = p_id;
    if not found then
        raise exception 'Perfil profissional não encontrado' using errcode = '22023';
    end if;

    -- A06: com a confirmação de e-mail desligada, o Supabase já grava
    -- email_confirmed_at no cadastro, então esta checagem passa sozinha.
    select u.email_confirmed_at is not null into v_confirmado
    from auth.users u where u.id = p_id;

    select count(*) into v_categorias
    from public.profissional_categoria pc
    join public.categorias c on c.id = pc.categoria_id
    where pc.profissional_id = p_id and c.ativa;

    v_checagens := jsonb_build_array(
        jsonb_build_object('codigo', 'email_confirmado', 'tipo', 'obrigatoria',
            'ok', coalesce(v_confirmado, false),
            'mensagem', case when coalesce(v_confirmado, false) then 'E-mail confirmado'
                             else 'E-mail ainda não confirmado' end),

        jsonb_build_object('codigo', 'maior_18', 'tipo', 'obrigatoria',
            'ok', v_p.data_nascimento <= (current_date - interval '18 years')::date,
            'mensagem', case when v_p.data_nascimento <= (current_date - interval '18 years')::date
                             then '18 anos ou mais' else 'Menor de 18 anos' end),

        jsonb_build_object('codigo', 'cidade_bairro', 'tipo', 'obrigatoria',
            'ok', coalesce(trim(v_p.cidade), '') <> '' and coalesce(trim(v_p.bairro), '') <> '',
            'mensagem', case
                when coalesce(trim(v_p.cidade), '') = '' and coalesce(trim(v_p.bairro), '') = ''
                    then 'Cidade e bairro não preenchidos'
                when coalesce(trim(v_p.cidade), '') = '' then 'Cidade não preenchida'
                when coalesce(trim(v_p.bairro), '') = '' then 'Bairro não preenchido'
                else 'Cidade e bairro preenchidos' end),

        jsonb_build_object('codigo', 'descricao_min', 'tipo', 'obrigatoria',
            'ok', char_length(trim(coalesce(v_p.descricao, ''))) >= 30,
            'mensagem', case when char_length(trim(coalesce(v_p.descricao, ''))) >= 30
                             then 'Descrição com 30 caracteres ou mais'
                             else 'Descrição com menos de 30 caracteres' end),

        jsonb_build_object('codigo', 'categoria_ativa', 'tipo', 'obrigatoria',
            'ok', v_categorias > 0,
            'mensagem', case when v_categorias > 0 then 'Pelo menos 1 categoria ativa'
                             else 'Nenhuma categoria ativa selecionada' end),

        jsonb_build_object('codigo', 'contato_valido', 'tipo', 'obrigatoria',
            'ok', public.telefone_br(v_p.whatsapp) is not null or public.telefone_br(v_p.telefone) is not null,
            'mensagem', case when public.telefone_br(v_p.whatsapp) is not null
                               or public.telefone_br(v_p.telefone) is not null
                             then 'WhatsApp ou telefone com DDD válido'
                             else 'WhatsApp e telefone sem DDD brasileiro válido (celular com 11 dígitos começa com 9)' end)
    );

    -- US-021 (BR14): sinais de suspeita, do tipo 'suspeita'.
    v_checagens := v_checagens || public.checagens_suspeita(p_id);

    -- BR12: qualquer sinal de suspeita vence; depois, qualquer obrigatória falhando.
    v_resultado := case
        when exists (select 1 from jsonb_array_elements(v_checagens) ch
                     where ch ->> 'tipo' = 'suspeita' and not (ch ->> 'ok')::boolean) then 'suspeito'
        when exists (select 1 from jsonb_array_elements(v_checagens) ch
                     where ch ->> 'tipo' = 'obrigatoria' and not (ch ->> 'ok')::boolean) then 'pendencia'
        else 'verde' end;

    select a.resultado, a.checagens into v_ult_res, v_ult_chec
    from public.analises_profissional a
    where a.profissional_id = p_id and a.acao = 'triagem'
    order by a.created_at desc, a.id desc
    limit 1;

    if v_ult_res is distinct from v_resultado
       or v_ult_chec is distinct from v_checagens then
        insert into public.analises_profissional (profissional_id, acao, resultado, checagens, autor_id)
        values (p_id, 'triagem', v_resultado, v_checagens, null);
    end if;

    return jsonb_build_object('resultado', v_resultado, 'checagens', v_checagens);
end;
$$;


-- 5. Reavaliação + BR18 --------------------------------------------------------------
-- Trava a linha, guarda o que falhava na triagem anterior, roda a triagem e,
-- se o aprovado ganhou um problema novo, volta para 'pendente'.
-- Roda como dono: o trigger validar_profissional permite a mudança de status.
-- Devolve a triagem com o status final: {resultado, checagens, status}.
create or replace function public.reavaliar_profissional(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_status  text;
    v_antes   text[];
    v_triagem jsonb;
    v_novos   integer;
begin
    select p.status_aprovacao into v_status
      from public.profissionais p
     where p.id = p_id
       for update;
    if not found then
        raise exception 'Perfil profissional não encontrado' using errcode = '22023';
    end if;

    select coalesce(array_agg(ch ->> 'codigo'), '{}') into v_antes
    from (select a.checagens from public.analises_profissional a
          where a.profissional_id = p_id and a.acao = 'triagem'
          order by a.created_at desc, a.id desc limit 1) t
    cross join lateral jsonb_array_elements(coalesce(t.checagens, '[]'::jsonb)) ch
    where not (ch ->> 'ok')::boolean;

    v_triagem := public.triar_profissional(p_id);

    select count(*) into v_novos
    from jsonb_array_elements(v_triagem -> 'checagens') ch
    where not (ch ->> 'ok')::boolean
      and not ((ch ->> 'codigo') = any (v_antes));

    if v_status = 'aprovado' and v_triagem ->> 'resultado' <> 'verde' and v_novos > 0 then
        update public.profissionais set status_aprovacao = 'pendente' where id = p_id;
        -- Texto neutro: o profissional lê o motivo das próprias linhas (011) e
        -- os sinais de suspeita não podem chegar até ele.
        insert into public.analises_profissional (profissional_id, acao, autor_id, motivo)
        values (p_id, 'reenvio', null, 'Perfil alterado depois da aprovação: nova análise necessária.');
        v_status := 'pendente';
    end if;

    return v_triagem || jsonb_build_object('status', v_status);
end;
$$;


-- 6. Chamada do app ------------------------------------------------------------------
-- Igual à 005, usando reavaliar_profissional e devolvendo o status.
-- Sinais de suspeita continuam NÃO voltando para o profissional.
create or replace function public.solicitar_analise()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_uid     uuid := (select auth.uid());
    v_triagem jsonb;
begin
    if v_uid is null or not exists (select 1 from public.profissionais where id = v_uid) then
        raise exception 'Somente profissionais com perfil podem solicitar a análise'
            using errcode = '42501';
    end if;

    v_triagem := public.reavaliar_profissional(v_uid);

    return jsonb_build_object(
        'resultado', case when v_triagem ->> 'resultado' = 'suspeito' then 'em_analise'
                          else v_triagem ->> 'resultado' end,
        'status', v_triagem ->> 'status',
        'pendencias', coalesce((select jsonb_agg(ch ->> 'mensagem')
                                from jsonb_array_elements(v_triagem -> 'checagens') ch
                                where ch ->> 'tipo' = 'obrigatoria' and not (ch ->> 'ok')::boolean),
                               '[]'::jsonb));
end;
$$;


-- 7. Trigger: aprovado editou pela API ---------------------------------------------------
-- Só edições feitas pelo app (anon/authenticated) de um aprovado, e só quando um
-- campo que a triagem olha mudou. O UPDATE de status feito dentro de
-- reavaliar_profissional não reentra (a coluna não está na lista e o status já
-- não é 'aprovado').
create or replace function public.reavaliar_aprovado_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.reavaliar_profissional(new.id);
    return null;
end;
$$;

drop trigger if exists profissionais_reavaliar_aprovado on public.profissionais;
create trigger profissionais_reavaliar_aprovado
    after update of whatsapp, telefone, descricao, cidade, bairro, data_nascimento
    on public.profissionais
    for each row
    when (old.status_aprovacao = 'aprovado'
          and public.eh_papel_cliente_api()
          and (old.whatsapp, old.telefone, old.descricao, old.cidade, old.bairro, old.data_nascimento)
              is distinct from
              (new.whatsapp, new.telefone, new.descricao, new.cidade, new.bairro, new.data_nascimento))
    execute function public.reavaliar_aprovado_trg();


-- Permissões: só solicitar_analise() é do app. O resto é interno (e a lista de
-- bloqueio não é revelada).
revoke execute on function public.termos_bloqueados()            from public, anon, authenticated;
revoke execute on function public.texto_sem_acento(text)         from public, anon, authenticated;
revoke execute on function public.sinais_descricao(text)         from public, anon, authenticated;
revoke execute on function public.checagens_suspeita(uuid)       from public, anon, authenticated;
revoke execute on function public.triar_profissional(uuid)       from public, anon, authenticated;
revoke execute on function public.reavaliar_profissional(uuid)   from public, anon, authenticated;
revoke execute on function public.reavaliar_aprovado_trg()       from public, anon, authenticated;
revoke execute on function public.solicitar_analise()            from public, anon;
grant  execute on function public.solicitar_analise()            to authenticated;


-- 8. Retriagem dos pendentes ------------------------------------------------------------
-- A fila passa a mostrar os sinais já agora, sem esperar cada profissional salvar de novo.
-- Aprovados não são retriados aqui: a BR18 só age quando o próprio profissional edita.
do $$
declare
    v_id uuid;
begin
    for v_id in select p.id from public.profissionais p where p.status_aprovacao = 'pendente' loop
        perform public.triar_profissional(v_id);
    end loop;
end;
$$;


-- 9. Autoconferência ---------------------------------------------------------------------
do $$
declare
    v_funcao   text;
    v_texto    text;
    v_esperado text;
    v_disparou text;
begin
    foreach v_funcao in array array['checagens_suspeita', 'triar_profissional', 'reavaliar_profissional',
                                    'solicitar_analise', 'reavaliar_aprovado_trg'] loop
        if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'public' and p.proname = v_funcao
                         and p.prosecdef and p.proconfig @> array['search_path=public']) then
            raise exception '012: %() precisa ser security definer com search_path fixo', v_funcao;
        end if;
    end loop;

    if has_function_privilege('authenticated', 'public.reavaliar_profissional(uuid)', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.checagens_suspeita(uuid)', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.termos_bloqueados()', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.triar_profissional(uuid)', 'EXECUTE')
       or has_function_privilege('anon', 'public.solicitar_analise()', 'EXECUTE') then
        raise exception '012: funções internas expostas ao app';
    end if;

    if not exists (select 1 from pg_trigger where tgrelid = 'public.profissionais'::regclass
                   and tgname = 'profissionais_reavaliar_aprovado' and not tgisinternal) then
        raise exception '012: trigger profissionais_reavaliar_aprovado não existe';
    end if;

    -- Exemplos do critério 2: texto e os sinais que devem disparar (em ordem alfabética; '' = nenhum).
    for v_texto, v_esperado in
        select * from (values
            ('Rua 12, casa 3. Atendo há 15 anos, chaveiro 24h.',      ''),
            ('Atendimento das 8h às 18h, R$ 50,00 a visita.',         ''),
            ('Sr. Pedro faz conserto rápido.',                        ''),
            ('Pintor. Veja www.meusite.com',                          'descricao_link'),
            ('Orçamentos em https://exemplo.net/x',                   'descricao_link'),
            ('Fale comigo: joao.silva@gmail.com',                     'descricao_email,descricao_link'),
            ('Ligue (11) 98888-7777 a qualquer hora',                 'descricao_telefone'),
            ('Trabalho com PIX ANTECIPADO e renda extra',             'descricao_termo'),
            ('Faço com depósito antecipado',                          'descricao_termo'),
            ('Atendo pelo wa.me/5511988887777',                       'descricao_link,descricao_telefone')
        ) e(texto, esperado)
    loop
        select coalesce(string_agg(s ->> 'codigo', ',' order by s ->> 'codigo'), '') into v_disparou
        from jsonb_array_elements(public.sinais_descricao(v_texto)) s
        where not (s ->> 'ok')::boolean;

        if v_disparou <> v_esperado then
            raise exception '012: "%" deveria disparar [%] e disparou [%]', v_texto, v_esperado, v_disparou;
        end if;
    end loop;
end;
$$;
