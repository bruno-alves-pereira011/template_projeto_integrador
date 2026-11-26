-- =====================================================================
-- HelpMe — 011: o profissional lê as decisões do próprio cadastro (US-013)
-- Requisitos: FR21, BR19, NFR01. Decisão do PO em 2026-11-26: leitura por
-- política de RLS na tabela, e não só por função.
--
-- O QUE FAZ:
--   1. Política analises_dono_le: o usuário logado vê só as linhas do PRÓPRIO
--      cadastro e só as decisões (aprovação, recusa, reenvio, suspensão,
--      reativação). Linhas de triagem não aparecem.
--   2. Privilégio por COLUNA, não na tabela: id, profissional_id, acao,
--      motivo e created_at. Ficam fechados:
--        checagens  -> traz os sinais de suspeita (US-021), que o profissional
--                      não pode ver (critério 5);
--        resultado  -> revelaria "suspeito";
--        autor_id   -> qual administrador decidiu.
--      Um select que peça essas colunas (ou "*") dá erro de permissão.
--   3. Nada de INSERT/UPDATE/DELETE: o histórico só muda pelas funções
--      security definer (decidir_profissionais, alterar_suspensao,
--      reenviar_para_analise, triar_profissional).
--
-- As pendências continuam vindo de minhas_pendencias() (010): elas moram em
-- 'checagens', junto com os sinais de suspeita, e coluna jsonb não se libera
-- pela metade.
--
-- ATENÇÃO: a 004 faz "revoke all" nesta tabela. Se a 004 for rodada de novo,
-- rode esta 011 depois dela.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 010. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- =====================================================================

do $$
begin
    if to_regprocedure('public.reenviar_para_analise()') is null then
        raise exception '011: aplique antes a 010_reenvio.sql';
    end if;
end;
$$;


-- 1. Privilégio por coluna -----------------------------------------------------
-- Começa do zero para a 011 poder ser rodada de novo sem acumular nada.
revoke all on public.analises_profissional from anon, authenticated;
grant select (id, profissional_id, acao, motivo, created_at)
    on public.analises_profissional to authenticated;


-- 2. Política: só as próprias decisões --------------------------------------------
drop policy if exists analises_dono_le on public.analises_profissional;
create policy analises_dono_le
    on public.analises_profissional
    for select
    to authenticated
    using (profissional_id = (select auth.uid()) and acao <> 'triagem');

comment on policy analises_dono_le on public.analises_profissional is
    'US-013: o profissional lê as decisões do próprio cadastro. Colunas liberadas só por grant de coluna (sem checagens, resultado e autor_id).';


-- 3. Autoconferência ---------------------------------------------------------------
do $$
declare
    v_coluna text;
begin
    if not (select relrowsecurity from pg_class where oid = 'public.analises_profissional'::regclass) then
        raise exception '011: RLS desligado em analises_profissional';
    end if;

    if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'analises_profissional') <> 1
       or not exists (select 1 from pg_policies
                      where schemaname = 'public' and tablename = 'analises_profissional'
                        and policyname = 'analises_dono_le' and cmd = 'SELECT'
                        and roles = array['authenticated']::name[]) then
        raise exception '011: analises_profissional deve ter só a política analises_dono_le (SELECT, authenticated)';
    end if;

    -- Nenhum privilégio na tabela inteira (só por coluna).
    if has_table_privilege('authenticated', 'public.analises_profissional', 'SELECT')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'INSERT')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'UPDATE')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'DELETE')
       or has_table_privilege('anon', 'public.analises_profissional', 'SELECT') then
        raise exception '011: authenticated/anon não podem ter privilégio na tabela inteira';
    end if;

    foreach v_coluna in array array['checagens', 'resultado', 'autor_id'] loop
        if has_column_privilege('authenticated', 'public.analises_profissional', v_coluna, 'SELECT') then
            raise exception '011: a coluna % não pode ser lida pelo app', v_coluna;
        end if;
    end loop;

    foreach v_coluna in array array['id', 'profissional_id', 'acao', 'motivo', 'created_at'] loop
        if not has_column_privilege('authenticated', 'public.analises_profissional', v_coluna, 'SELECT') then
            raise exception '011: falta o privilégio de leitura na coluna %', v_coluna;
        end if;
    end loop;
end;
$$;
