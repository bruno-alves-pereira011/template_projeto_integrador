-- =====================================================================
-- HelpMe — 018: só avalia quem teve um serviço concluído (US-025)
-- Requisitos: FR33, FR34, BR27, BR28, BR29, NFR13
-- (docs/requirements/helpme-marco3-orcamento-avaliacao.md). Fecha o item 5 da banca de 2026-11-26.
--
-- O QUE FAZ:
--   1. BR29: APAGA as avaliações sem contratação 'concluida' entre o autor e o profissional
--      (no banco real, em 2026-11-27, só a id 1, que veio do seed). As outras ficam.
--   2. BR27: "autor cria" e "autor edita" passam a exigir contratação 'concluida' do autor
--      (como cliente) com aquele profissional. A regra de uma avaliação por cliente e
--      profissional (unique da 001), a nota de 1 a 5 e o comentário até 500 (014) continuam.
--   3. BR28: a política "autor apaga" sai. Ninguém apaga avaliação pelo app; profissional e
--      admin não têm política de escrita, então não mexem em avaliação alheia.
--   4. Permissões por coluna: pelo app só se GRAVA usuario_id, profissional_id, nota e
--      comentario, e só se EDITA nota e comentario. Antes a edição aceitava qualquer coluna:
--      dava para "mover" a avaliação para outro profissional ou forjar created_at.
--      Visitante (anon) perde insert/update/delete (o RLS já barrava; agora nem a permissão existe).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 017. Pode ser rodada de novo.
-- Depois, rode supabase/testes/018_avaliacoes.sql.
-- =====================================================================

-- 1. BR29 -------------------------------------------------------------------------------------
do $$
declare
    v_n integer;
begin
    delete from public.avaliacoes a
    where not exists (
        select 1 from public.contratacoes c
        where c.cliente_id = a.usuario_id
          and c.profissional_id = a.profissional_id
          and c.status = 'concluida');
    get diagnostics v_n = row_count;
    raise notice '018: % avaliação(ões) sem contratação concluída apagada(s) (BR29)', v_n;
end;
$$;


-- 2 e 3. Políticas ------------------------------------------------------------------------------
drop policy if exists "avaliacoes: autor cria"  on public.avaliacoes;
drop policy if exists "avaliacoes: autor edita" on public.avaliacoes;
drop policy if exists "avaliacoes: autor apaga" on public.avaliacoes;

-- Em nome próprio, de profissional aprovado, com quem o autor teve contratação concluída como
-- cliente. A consulta em contratacoes passa pelo RLS dela: o cliente só enxerga as próprias.
create policy "avaliacoes: autor cria"
    on public.avaliacoes for insert to authenticated
    with check (
        usuario_id = (select auth.uid())
        and exists (select 1 from public.profissionais p
                    where p.id = profissional_id and p.status_aprovacao = 'aprovado')
        and exists (select 1 from public.contratacoes c
                    where c.cliente_id = (select auth.uid())
                      and c.profissional_id = avaliacoes.profissional_id
                      and c.status = 'concluida')
    );

create policy "avaliacoes: autor edita"
    on public.avaliacoes for update to authenticated
    using (usuario_id = (select auth.uid()))
    with check (
        usuario_id = (select auth.uid())
        and exists (select 1 from public.profissionais p
                    where p.id = profissional_id and p.status_aprovacao = 'aprovado')
        and exists (select 1 from public.contratacoes c
                    where c.cliente_id = (select auth.uid())
                      and c.profissional_id = avaliacoes.profissional_id
                      and c.status = 'concluida')
    );


-- 4. Permissões por coluna ----------------------------------------------------------------------
-- Para o privilégio de coluna valer, o de tabela precisa sair antes.
revoke insert, update, delete on public.avaliacoes from anon, authenticated;
grant insert (usuario_id, profissional_id, nota, comentario) on public.avaliacoes to authenticated;
grant update (nota, comentario) on public.avaliacoes to authenticated;


-- Autoconferência -------------------------------------------------------------------------------
do $$
begin
    if exists (select 1 from public.avaliacoes a
               where not exists (select 1 from public.contratacoes c
                                 where c.cliente_id = a.usuario_id and c.profissional_id = a.profissional_id
                                   and c.status = 'concluida')) then
        raise exception '018: ainda há avaliação sem contratação concluída';
    end if;
    if exists (select 1 from pg_policy where polrelid = 'public.avaliacoes'::regclass and polcmd = 'd') then
        raise exception '018: ainda existe política de delete em avaliacoes';
    end if;
    if (select count(*) from pg_policy where polrelid = 'public.avaliacoes'::regclass
          and polname in ('avaliacoes: autor cria', 'avaliacoes: autor edita')
          and position('concluida' in coalesce(pg_get_expr(polwithcheck, polrelid), '')) > 0) <> 2 then
        raise exception '018: políticas de criar/editar sem a condição da BR27';
    end if;
    if has_table_privilege('authenticated', 'public.avaliacoes', 'DELETE')
    or has_table_privilege('anon', 'public.avaliacoes', 'INSERT')
    or has_table_privilege('anon', 'public.avaliacoes', 'UPDATE')
    or has_column_privilege('authenticated', 'public.avaliacoes', 'profissional_id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.avaliacoes', 'usuario_id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.avaliacoes', 'created_at', 'UPDATE')
    or has_column_privilege('authenticated', 'public.avaliacoes', 'created_at', 'INSERT') then
        raise exception '018: permissões de escrita de avaliacoes largas demais';
    end if;
    if not has_column_privilege('authenticated', 'public.avaliacoes', 'nota', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.avaliacoes', 'comentario', 'INSERT') then
        raise exception '018: faltou permissão para o cliente gravar a avaliação';
    end if;
end;
$$;
