-- =====================================================================
-- HelpMe — 010: motivo, pendências e reenvio para análise (US-013)
-- Requisitos: FR21, BR17, BR19, NFR10. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. minhas_pendencias(): o profissional lê as pendências OBRIGATÓRIAS da
--      última triagem do PRÓPRIO cadastro (só as mensagens). Sinais de
--      suspeita (US-021), autor e demais campos internos não saem daqui.
--   2. reenviar_para_analise(): profissional RECUSADO volta para 'pendente',
--      o reenvio fica no histórico (BR19) e a triagem roda de novo (BR17).
--      Qualquer outro status: erro, nada muda.
--
-- O motivo da recusa já é lido por minha_ultima_decisao() (007, US-019).
--
-- A leitura das decisões pela tabela (política + privilégio por coluna) é
-- da 011. As pendências ficam em função porque moram em 'checagens', junto
-- com os sinais de suspeita (critério 5).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 007. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho: se algo ficou
-- errado, dá ERRO.
-- =====================================================================

do $$
begin
    if to_regprocedure('public.triar_profissional(uuid)') is null
       or to_regprocedure('public.minha_ultima_decisao()') is null then
        raise exception '010: aplique antes a 005_triagem.sql e a 007_suspensao.sql';
    end if;
end;
$$;


-- 1. Pendências do próprio cadastro -----------------------------------------
-- Lista de textos, na ordem das checagens. [] se não houver triagem ou se
-- tudo passou. Visitante ou quem não tem perfil: [] (auth.uid() não casa).
create or replace function public.minhas_pendencias()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((
        select jsonb_agg(x.ch ->> 'mensagem' order by x.ordem)
        from (
            select a.checagens
            from public.analises_profissional a
            where a.profissional_id = (select auth.uid())
              and a.acao = 'triagem'
            order by a.created_at desc, a.id desc
            limit 1
        ) t
        cross join lateral jsonb_array_elements(coalesce(t.checagens, '[]'::jsonb))
             with ordinality as x(ch, ordem)
        where x.ch ->> 'tipo' = 'obrigatoria'
          and not (x.ch ->> 'ok')::boolean
    ), '[]'::jsonb);
$$;

comment on function public.minhas_pendencias() is
    'Pendências obrigatórias da última triagem do próprio cadastro (US-013). Não revela sinais de suspeita.';


-- 2. Reenvio -----------------------------------------------------------------
-- Roda como dono da função: o trigger validar_profissional não barra a volta
-- para 'pendente' (eh_papel_cliente_api() é falso aqui dentro), e só este
-- caminho existe para o profissional mudar o próprio status.
-- A linha é travada (FOR UPDATE): se um admin mexer ao mesmo tempo, quem
-- chegar depois vê o status já mudado.
-- autor_id = o próprio profissional (o detalhe do admin mostra o nome dele).
-- Devolve { status: 'pendente', pendencias: [...] } como solicitar_analise().
create or replace function public.reenviar_para_analise()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_uid     uuid := (select auth.uid());
    v_status  text;
    v_triagem jsonb;
begin
    if v_uid is null then
        raise exception 'Somente profissionais com perfil podem reenviar o cadastro'
            using errcode = '42501';
    end if;

    select p.status_aprovacao into v_status
      from public.profissionais p
     where p.id = v_uid
       for update;

    if not found then
        raise exception 'Somente profissionais com perfil podem reenviar o cadastro'
            using errcode = '42501';
    end if;

    if v_status <> 'recusado' then
        raise exception 'Só um cadastro recusado pode ser reenviado para análise (status atual: %)', v_status
            using errcode = '22023';
    end if;

    update public.profissionais
       set status_aprovacao = 'pendente'
     where id = v_uid;

    insert into public.analises_profissional (profissional_id, acao, autor_id)
    values (v_uid, 'reenvio', v_uid);

    -- BR17: nova triagem. O sinal "já recusado" (BR14) entra na US-021.
    v_triagem := public.triar_profissional(v_uid);

    return jsonb_build_object(
        'status', 'pendente',
        'pendencias', coalesce((select jsonb_agg(ch ->> 'mensagem')
                                from jsonb_array_elements(v_triagem -> 'checagens') ch
                                where ch ->> 'tipo' = 'obrigatoria' and not (ch ->> 'ok')::boolean),
                               '[]'::jsonb));
end;
$$;

comment on function public.reenviar_para_analise() is
    'Profissional recusado volta para pendente, com reenvio no histórico e nova triagem (US-013, BR17).';

revoke execute on function public.minhas_pendencias()      from public, anon;
revoke execute on function public.reenviar_para_analise()  from public, anon;
grant  execute on function public.minhas_pendencias()      to authenticated;
grant  execute on function public.reenviar_para_analise()  to authenticated;


-- 3. Autoconferência -----------------------------------------------------------
do $$
declare
    v_funcao text;
begin
    foreach v_funcao in array array['minhas_pendencias', 'reenviar_para_analise'] loop
        if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'public' and p.proname = v_funcao
                         and p.prosecdef and p.proconfig @> array['search_path=public']) then
            raise exception '010: %() precisa ser security definer com search_path fixo', v_funcao;
        end if;
    end loop;

    if has_function_privilege('anon', 'public.reenviar_para_analise()', 'EXECUTE')
       or has_function_privilege('anon', 'public.minhas_pendencias()', 'EXECUTE') then
        raise exception '010: anon não pode chamar as funções da 010';
    end if;

    -- Nada de privilégio na tabela inteira; a única política aceita é a da 011.
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'analises_profissional'
                 and policyname <> 'analises_dono_le')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'SELECT') then
        raise exception '010: analises_profissional não pode ser lida inteira pelo app';
    end if;

    if not exists (select 1 from pg_constraint
                   where conrelid = 'public.analises_profissional'::regclass and contype = 'c'
                     and pg_get_constraintdef(oid) like '%reenvio%') then
        raise exception '010: o histórico não aceita a ação reenvio';
    end if;
end;
$$;
