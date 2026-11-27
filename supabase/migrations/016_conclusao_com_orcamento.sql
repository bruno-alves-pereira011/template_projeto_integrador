-- =====================================================================
-- HelpMe — 016: concluir só com valor aprovado e cancelar antes de aprovar (US-023)
-- Requisitos: BR23 (substitui parte da BR06), FR31, NFR13
-- (docs/requirements/helpme-marco3-orcamento-avaliacao.md).
--
-- O QUE FAZ: troca o corpo do trigger validar_contratacao (criado na 001,
-- que não é editada: DEBT-008). As transições passam a ser:
--   solicitada -> aceita | recusada   só o profissional contratado (igual)
--   solicitada -> cancelada           só o cliente (igual)
--   aceita     -> cancelada           NOVO: só o cliente, e só sem orçamento aprovado
--   aceita     -> concluida           qualquer das partes, AGORA só com orçamento aprovado
-- Todo o resto continua recusado. Mensagens e códigos das regras antigas
-- não mudam; as regras novas usam 22023 (regra) e 42501 (não é a parte),
-- como as funções da 015.
--
-- POR QUE A FUNÇÃO CONTINUA SEM security definer:
--   eh_papel_cliente_api() olha o current_user. Com security definer ele
--   viraria 'postgres' e o trigger deixaria de barrar o app. A leitura de
--   orcamentos aqui passa pelo RLS da 015, que deixa as duas partes lerem,
--   e só as partes conseguem atualizar uma contratação ("partes atualizam").
--   Ganha search_path fixo (todos os nomes já vêm com schema).
--
-- CORRIDA aprovar x cancelar/concluir: responder_orcamento() trava a linha da
-- contratação (for update). O UPDATE do app espera essa trava e, quando o
-- trigger roda, a consulta em orcamentos já enxerga a resposta gravada.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 015. Não altera dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- Depois, rode supabase/testes/016_conclusao_com_orcamento.sql.
-- =====================================================================

do $$
begin
    if to_regclass('public.orcamentos') is null then
        raise exception '016: rode antes a 015_orcamentos.sql (tabela orcamentos não existe)';
    end if;
end;
$$;


create or replace function public.validar_contratacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_tem_aprovado boolean;
begin
    if tg_op = 'INSERT' then
        -- BR09 vale para todos (inclusive o seed): data no passado não.
        if new.data_desejada < now() then
            raise exception 'A data/horário desejado não pode estar no passado';
        end if;

        if public.eh_papel_cliente_api() then
            -- Datas de controle sempre do servidor, nunca do navegador.
            new.created_at := now();
            new.updated_at := now();
        end if;
        return new;
    end if;

    -- UPDATE
    new.updated_at := now();

    -- Equipe/painel pode corrigir dados livremente.
    if not public.eh_papel_cliente_api() then
        return new;
    end if;

    if v_uid is null then
        raise exception 'É preciso estar logado para alterar uma contratação';
    end if;

    if new.id              is distinct from old.id
    or new.cliente_id      is distinct from old.cliente_id
    or new.profissional_id is distinct from old.profissional_id
    or new.descricao       is distinct from old.descricao
    or new.endereco        is distinct from old.endereco
    or new.data_desejada   is distinct from old.data_desejada
    or new.created_at      is distinct from old.created_at then
        raise exception 'Só o status de uma contratação pode ser alterado';
    end if;

    if old.status = 'solicitada' and new.status in ('aceita', 'recusada') then
        if v_uid <> old.profissional_id then
            raise exception 'Somente o profissional contratado pode aceitar ou recusar';
        end if;
        -- Profissional que deixou de estar aprovado não aceita trabalho novo.
        if new.status = 'aceita' and not exists (
               select 1 from public.profissionais p
               where p.id = v_uid and p.status_aprovacao = 'aprovado') then
            raise exception 'Somente profissional aprovado pode aceitar contratações';
        end if;

    elsif old.status = 'solicitada' and new.status = 'cancelada' then
        if v_uid <> old.cliente_id then
            raise exception 'Somente o cliente pode cancelar a contratação';
        end if;

    elsif old.status = 'aceita' and new.status in ('cancelada', 'concluida') then
        -- BR23: o orçamento aprovado decide as duas saídas da contratação aceita.
        v_tem_aprovado := exists (
            select 1 from public.orcamentos o
            where o.contratacao_id = old.id and o.situacao = 'aprovado');

        if new.status = 'cancelada' then
            if v_uid <> old.cliente_id then
                raise exception 'Somente o cliente pode cancelar a contratação' using errcode = '42501';
            end if;
            if v_tem_aprovado then
                raise exception 'O valor já foi aprovado: esta contratação não pode mais ser cancelada.' using errcode = '22023';
            end if;
        else
            if v_uid <> old.cliente_id and v_uid <> old.profissional_id then
                raise exception 'Somente as partes da contratação podem concluí-la' using errcode = '42501';
            end if;
            if not v_tem_aprovado then
                raise exception 'Combine e aprove o valor antes de concluir.' using errcode = '22023';
            end if;
        end if;

    else
        raise exception 'Transição de status inválida: % -> %', old.status, new.status;
    end if;

    return new;
end;
$$;

comment on function public.validar_contratacao() is
    'Trigger de contratacoes: datas do servidor, só o status muda, transições da BR23 (016). Sem security definer de propósito (eh_papel_cliente_api olha o current_user).';


-- Autoconferência -------------------------------------------------------------------------------
do $$
declare
    v_def text := pg_get_functiondef('public.validar_contratacao()'::regprocedure);
begin
    if (select prosecdef from pg_proc where oid = 'public.validar_contratacao()'::regprocedure) then
        raise exception '016: validar_contratacao não pode ser security definer';
    end if;
    if not exists (select 1 from pg_proc p, unnest(p.proconfig) c
                   where p.oid = 'public.validar_contratacao()'::regprocedure and c like 'search_path=%') then
        raise exception '016: validar_contratacao sem search_path fixo';
    end if;
    if position('Combine e aprove o valor antes de concluir.' in v_def) = 0 then
        raise exception '016: corpo novo do trigger não foi gravado';
    end if;
    if not exists (select 1 from pg_trigger
                   where tgrelid = 'public.contratacoes'::regclass and tgname = 'contratacoes_validar' and tgenabled <> 'D') then
        raise exception '016: trigger contratacoes_validar ausente ou desligado';
    end if;
end;
$$;
