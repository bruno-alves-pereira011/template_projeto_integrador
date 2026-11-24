-- =====================================================================
-- HelpMe — 009: administrador não contrata serviços (DEBT-009, decisão do PO)
-- Requisitos: BR10 (só cliente contrata) e BR11 (admin é quem está em
-- 'administradores', não um tipo_usuario).
--
-- O PROBLEMA: a conta do admin é do tipo 'cliente' em 'usuarios'. A
-- política "contratacoes: cliente contrata profissional aprovado" (001)
-- olha só o tipo, então o admin conseguia criar uma contratação. Decisão
-- do PO em 2026-11-24: o admin não é cliente e não contrata nada.
--
-- O QUE FAZ: um trigger BEFORE INSERT em contratacoes recusa a linha
-- quando o cliente_id está em 'administradores'. O app já não mostra o
-- "Contratar" ao admin e manda ele para o painel (js/servicos/sessao.js);
-- isto barra também quem chamar a API direto.
--
-- POR QUE TRIGGER E NÃO MUDAR A POLÍTICA? A autoconferência da 008 recusa
-- qualquer política em contratacoes que cite eh_admin (BR21: nenhuma porta
-- de admin nas contratações). Uma regra separada, que só RECUSA, mantém a
-- 008 válida se for rodada de novo.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 003 (usa administradores).
-- Não altera dados e pode ser rodado de novo. No final ele se confere.
-- =====================================================================


-- security definer: lê administradores, que o app não pode ler (003).
-- search_path fixo: ninguém troca "public.administradores" por outra tabela.
create or replace function public.impedir_admin_contratar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if exists (select 1 from public.administradores a where a.usuario_id = new.cliente_id) then
        raise exception 'Administrador não contrata serviços (BR10).'
            using errcode = '42501';
    end if;
    return new;
end;
$$;

comment on function public.impedir_admin_contratar() is
    'BR10/BR11: recusa contratação cujo cliente é administrador. Trigger contratacoes_impedir_admin (009).';

revoke execute on function public.impedir_admin_contratar() from public, anon, authenticated;

drop trigger if exists contratacoes_impedir_admin on public.contratacoes;
create trigger contratacoes_impedir_admin
    before insert on public.contratacoes
    for each row execute function public.impedir_admin_contratar();


-- Autoconferência ---------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'impedir_admin_contratar'
                     and p.prosecdef and p.proconfig @> array['search_path=public']) then
        raise exception '009: impedir_admin_contratar() precisa ser security definer com search_path fixo';
    end if;

    if not exists (select 1 from pg_trigger t
                   where t.tgrelid = 'public.contratacoes'::regclass
                     and t.tgname = 'contratacoes_impedir_admin'
                     and not t.tgisinternal and t.tgenabled <> 'D') then
        raise exception '009: trigger contratacoes_impedir_admin ausente ou desligado';
    end if;

    -- A 008 continua valendo: nenhuma política de contratacoes cita eh_admin (BR21).
    if exists (select 1 from pg_policies
               where schemaname = 'public' and tablename in ('contratacoes', 'mensagens')
                 and (qual ilike '%eh_admin%' or with_check ilike '%eh_admin%')) then
        raise exception '009: contratacoes/mensagens não podem ter política de admin (BR21)';
    end if;
end;
$$;
