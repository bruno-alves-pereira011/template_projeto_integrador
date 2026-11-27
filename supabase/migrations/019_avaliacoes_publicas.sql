-- =====================================================================
-- HelpMe — 019: avaliações no perfil público (US-026)
-- Requisitos: FR35, NFR15, A11 (docs/requirements/helpme-marco3-orcamento-avaliacao.md).
--
-- O QUE FAZ: cria public.avaliacoes_do_profissional(p_profissional_id), que devolve as
-- até 20 avaliações mais recentes de um profissional APROVADO, com:
--   nota, comentario, autor (SÓ o primeiro nome) e criada_em.
-- Nada além disso: nem o id do cliente, nem sobrenome, telefone ou id da avaliação (NFR15).
--
-- POR QUE security definer: o visitante não lê public.usuarios de clientes (014), então
-- não teria como saber o nome do autor. A função lê como dono, mas só entrega o primeiro
-- nome, e só de profissional aprovado (o mesmo que o perfil público mostra).
-- search_path vazio e todos os nomes com schema.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 018. Não altera dados e pode ser rodada
-- de novo. Depois, rode supabase/testes/019_avaliacoes_publicas.sql.
-- =====================================================================

create or replace function public.avaliacoes_do_profissional(p_profissional_id uuid)
returns table (nota smallint, comentario text, autor text, criada_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select a.nota,
           a.comentario,
           -- Primeiro nome: todo espaço em branco (tab, quebra de linha) vira um espaço, apara as
           -- pontas e fica a primeira palavra. Nome vazio vira "Cliente".
           coalesce(nullif(split_part(btrim(regexp_replace(u.nome, '\s+', ' ', 'g')), ' ', 1), ''), 'Cliente'),
           a.created_at
    from public.avaliacoes a
    join public.usuarios u on u.id = a.usuario_id
    where a.profissional_id = p_profissional_id
      and exists (select 1 from public.profissionais p
                  where p.id = p_profissional_id and p.status_aprovacao = 'aprovado')
    order by a.created_at desc, a.id desc
    limit 20;
$$;

comment on function public.avaliacoes_do_profissional(uuid) is
    'US-026: até 20 avaliações mais recentes de profissional aprovado, com só o primeiro nome do autor (NFR15).';

revoke execute on function public.avaliacoes_do_profissional(uuid) from public;
grant execute on function public.avaliacoes_do_profissional(uuid) to anon, authenticated;


-- Autoconferência -------------------------------------------------------------------------------
do $$
declare
    v_oid oid := 'public.avaliacoes_do_profissional(uuid)'::regprocedure;
begin
    if not (select prosecdef from pg_proc where oid = v_oid) then
        raise exception '019: avaliacoes_do_profissional precisa ser security definer';
    end if;
    if not exists (select 1 from pg_proc p, unnest(p.proconfig) c where p.oid = v_oid and c like 'search_path=%') then
        raise exception '019: avaliacoes_do_profissional sem search_path fixo';
    end if;
    if not has_function_privilege('anon', v_oid, 'EXECUTE') then
        raise exception '019: visitante não consegue chamar avaliacoes_do_profissional';
    end if;
    if (select array_agg(a order by a) from unnest((select proargnames from pg_proc where oid = v_oid)) a)
       is distinct from array['autor', 'comentario', 'criada_em', 'nota', 'p_profissional_id'] then
        raise exception '019: a função devolve colunas diferentes de nota, comentario, autor e criada_em';
    end if;
end;
$$;
