-- =====================================================================
-- HelpMe — 005: triagem automática, checagens obrigatórias (US-016)
-- Requisitos: FR20, BR12, BR13, A06. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. categorias.ativa (default true). A BR13 conta só categoria ATIVA.
--      A tela de gestão (desativar/reativar) é da US-018.
--   2. telefone_br(texto): normaliza como o js/telefone.js e valida o DDD
--      brasileiro. Devolve só os dígitos (10 ou 11) ou null.
--   3. triar_profissional(id): roda as checagens da BR13 e grava o
--      resultado em analises_profissional (acao 'triagem', autor nulo =
--      sistema). INTERNA: ninguém do app chama direto.
--   4. solicitar_analise(): o profissional logado pede a triagem do
--      PRÓPRIO perfil. O completar-perfil.js chama ao final do salvamento,
--      depois de gravar as categorias (um trigger em profissionais rodaria
--      antes das categorias existirem).
--   5. Triagem inicial dos pendentes que ainda não têm nenhuma.
--
-- A TRIAGEM SÓ CLASSIFICA (BR12): verde ou pendencia. Nunca muda o
-- status_aprovacao. Sinais de suspeita ('suspeito') e a volta do aprovado
-- para pendente (BR18) são da US-021, que acrescenta checagens do tipo
-- 'suspeita' em triar_profissional.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 004. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- =====================================================================


-- 1. Categoria ativa ------------------------------------------------------
alter table public.categorias
    add column if not exists ativa boolean not null default true;

comment on column public.categorias.ativa is
    'false = desativada (BR20). Não conta como categoria ativa na triagem (BR13). Gestão na US-018.';


-- 2. Telefone brasileiro -----------------------------------------------------
-- Mesma normalização do js/telefone.js: tira tudo que não é dígito e o 55
-- do país (12 ou 13 dígitos começando com 55). Válido = 10 ou 11 dígitos,
-- DDD existente no Brasil e, com 11 dígitos, celular começando com 9.
create or replace function public.telefone_br(p_numero text)
returns text
language sql
immutable
set search_path = public
as $$
    with d as (
        select regexp_replace(coalesce(p_numero, ''), '\D', '', 'g') as x
    ), n as (
        select case when char_length(x) in (12, 13) and left(x, 2) = '55'
                    then substr(x, 3) else x end as x
        from d
    )
    select x from n
    where char_length(x) in (10, 11)
      and left(x, 2) = any (array[
          '11','12','13','14','15','16','17','18','19',
          '21','22','24','27','28',
          '31','32','33','34','35','37','38',
          '41','42','43','44','45','46','47','48','49',
          '51','53','54','55',
          '61','62','63','64','65','66','67','68','69',
          '71','73','74','75','77','79',
          '81','82','83','84','85','86','87','88','89',
          '91','92','93','94','95','96','97','98','99'])
      and (char_length(x) = 10 or substr(x, 3, 1) = '9');
$$;

comment on function public.telefone_br(text) is
    'Dígitos do telefone brasileiro (DDD + número, sem 55) ou null se inválido. Mesma regra do js/telefone.js + DDD (BR13).';


-- 3. Triagem -----------------------------------------------------------------
-- Formato de cada checagem (combinado com a 004/US-015):
--   {"codigo", "tipo": "obrigatoria", "ok": bool, "mensagem"}
-- A mensagem descreve o que passou ou, se falhou, o que falta corrigir
-- (é o texto que o admin vê na fila e o profissional vê ao salvar).
--
-- Só grava uma linha nova se o resultado ou as checagens mudaram desde a
-- última triagem: salvar o perfil várias vezes sem mudar nada não enche o
-- histórico.
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

    -- BR12. 'suspeita' só existe a partir da US-021; já fica previsto aqui.
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


-- 4. Chamada do app -------------------------------------------------------------
-- Sem parâmetro: só triagem do próprio perfil (auth.uid()). Devolve o
-- resultado e as pendências obrigatórias, que a tela mostra ao profissional.
-- Sinais de suspeita (US-021) NÃO voltam para o profissional.
create or replace function public.solicitar_analise()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_uid        uuid := (select auth.uid());
    v_triagem    jsonb;
begin
    if v_uid is null or not exists (select 1 from public.profissionais where id = v_uid) then
        raise exception 'Somente profissionais com perfil podem solicitar a análise'
            using errcode = '42501';
    end if;

    v_triagem := public.triar_profissional(v_uid);

    return jsonb_build_object(
        'resultado', case when v_triagem ->> 'resultado' = 'suspeito' then 'em_analise'
                          else v_triagem ->> 'resultado' end,
        'pendencias', coalesce((select jsonb_agg(ch ->> 'mensagem')
                                from jsonb_array_elements(v_triagem -> 'checagens') ch
                                where ch ->> 'tipo' = 'obrigatoria' and not (ch ->> 'ok')::boolean),
                               '[]'::jsonb));
end;
$$;

revoke execute on function public.triar_profissional(uuid) from public, anon, authenticated;
revoke execute on function public.solicitar_analise()      from public, anon;
grant  execute on function public.solicitar_analise()      to authenticated;


-- 5. Triagem inicial ---------------------------------------------------------------
-- Pendentes cadastrados antes da 005 ainda não têm triagem ("Sem triagem" na fila).
do $$
declare
    v_id uuid;
begin
    for v_id in
        select p.id from public.profissionais p
        where p.status_aprovacao = 'pendente'
          and not exists (select 1 from public.analises_profissional a
                          where a.profissional_id = p.id and a.acao = 'triagem')
    loop
        perform public.triar_profissional(v_id);
    end loop;
end;
$$;


-- 6. Autoconferência -----------------------------------------------------------------
do $$
begin
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'categorias' and column_name = 'ativa') then
        raise exception '005: coluna categorias.ativa não existe';
    end if;

    if public.telefone_br('(11) 97777-0001') is distinct from '11977770001'
       or public.telefone_br('+55 27 3333-0001') is distinct from '2733330001'
       or public.telefone_br('(00) 97777-0001') is not null
       or public.telefone_br('(11) 87777-0001') is not null
       or public.telefone_br('97777-0001') is not null then
        raise exception '005: telefone_br não segue a regra da BR13';
    end if;

    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'solicitar_analise'
                     and p.prosecdef and p.proconfig @> array['search_path=public'])
       or not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = 'triar_profissional'
                        and p.prosecdef and p.proconfig @> array['search_path=public']) then
        raise exception '005: solicitar_analise/triar_profissional precisam ser security definer com search_path fixo';
    end if;

    if has_function_privilege('authenticated', 'public.triar_profissional(uuid)', 'EXECUTE')
       or has_function_privilege('anon', 'public.triar_profissional(uuid)', 'EXECUTE')
       or has_function_privilege('anon', 'public.solicitar_analise()', 'EXECUTE') then
        raise exception '005: triar_profissional é interna e solicitar_analise não é para visitante';
    end if;

    if exists (select 1 from public.profissionais p
               where p.status_aprovacao = 'pendente'
                 and not exists (select 1 from public.analises_profissional a
                                 where a.profissional_id = p.id and a.acao = 'triagem')) then
        raise exception '005: ainda há pendente sem triagem';
    end if;
end;
$$;
