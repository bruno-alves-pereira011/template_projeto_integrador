-- =====================================================================
-- HelpMe — 015: orçamento da contratação (US-022)
-- Requisitos: FR27–FR30, BR24–BR26, NFR12, NFR13
-- (docs/requirements/helpme-marco3-orcamento-avaliacao.md).
--
-- O QUE FAZ:
--   1. Tabela orcamentos: cada valor que o profissional envia numa
--      contratação 'aceita', com a resposta do cliente. Guarda o histórico
--      (FR30). A contratação NÃO ganha status novo: continua 'aceita'.
--   2. Valor em centavos inteiros, de 100 (R$ 1,00) a 10.000.000
--      (R$ 100.000,00); observação opcional até 200 caracteres (BR26).
--   3. No máximo um orçamento 'aguardando' e um 'aprovado' por contratação
--      (BR24), garantido por índice único (segura também duas abas).
--   4. Ninguém escreve na tabela pelo app. Enviar e responder passam por
--      enviar_orcamento() e responder_orcamento() (security definer), que
--      conferem quem é a parte certa (BR25) e travam a contratação.
--   5. Só as partes leem (o admin não lê pela tabela, como na BR21).
--   6. Realtime: a outra parte vê o envio e a resposta sem recarregar.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 014. Não altera dados
-- existentes e pode ser rodado de novo. No final ele se confere sozinho.
-- Depois, rode supabase/testes/015_orcamentos.sql.
-- =====================================================================


-- 1. Tabela -----------------------------------------------------------------------------
create table if not exists public.orcamentos (
    id              bigint generated always as identity primary key,
    contratacao_id  bigint not null references public.contratacoes (id) on delete cascade,
    valor_centavos  integer not null,
    observacao      text,
    situacao        text not null default 'aguardando',
    created_at      timestamptz not null default now(),
    respondido_em   timestamptz,
    constraint orcamentos_valor_faixa      check (valor_centavos between 100 and 10000000),
    constraint orcamentos_observacao_tam   check (observacao is null or char_length(observacao) between 1 and 200),
    constraint orcamentos_situacao_valida  check (situacao in ('aguardando', 'aprovado', 'recusado')),
    constraint orcamentos_resposta_coerente check ((situacao = 'aguardando') = (respondido_em is null))
);

comment on table public.orcamentos is
    'Valores enviados pelo profissional numa contratação aceita e a resposta do cliente (US-022). Escrita só por enviar_orcamento() e responder_orcamento().';

create index if not exists orcamentos_contratacao on public.orcamentos (contratacao_id, created_at);
create unique index if not exists orcamentos_um_aguardando on public.orcamentos (contratacao_id) where situacao = 'aguardando';
create unique index if not exists orcamentos_um_aprovado   on public.orcamentos (contratacao_id) where situacao = 'aprovado';


-- 2. RLS e privilégios ----------------------------------------------------------------------
alter table public.orcamentos enable row level security;

drop policy if exists "orcamentos: partes leem" on public.orcamentos;
create policy "orcamentos: partes leem"
    on public.orcamentos for select to authenticated
    using (exists (
        select 1 from public.contratacoes c
        where c.id = orcamentos.contratacao_id
          and (c.cliente_id = (select auth.uid()) or c.profissional_id = (select auth.uid()))
    ));

-- O Supabase concede tudo em tabela nova a anon/authenticated: fecha e libera só a leitura.
revoke all on public.orcamentos from public, anon, authenticated;
grant select on public.orcamentos to authenticated;


-- 3. Enviar orçamento (profissional) ---------------------------------------------------------
create or replace function public.enviar_orcamento(
    p_contratacao_id bigint,
    p_valor_centavos integer,
    p_observacao     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid  uuid := auth.uid();
    v_c    public.contratacoes%rowtype;
    v_obs  text := nullif(btrim(coalesce(p_observacao, '')), '');
    v_novo public.orcamentos%rowtype;
begin
    if v_uid is null then
        raise exception 'É preciso estar logado para enviar um orçamento.' using errcode = '42501';
    end if;

    -- Trava a contratação: dois envios ao mesmo tempo ficam em fila.
    select * into v_c from public.contratacoes where id = p_contratacao_id for update;

    -- Mesma resposta se a contratação não existe ou é de outra pessoa (não revela ids).
    if not found or v_c.profissional_id <> v_uid then
        raise exception 'Somente o profissional desta contratação envia orçamento.' using errcode = '42501';
    end if;

    if v_c.status <> 'aceita' then
        raise exception 'Só dá para enviar orçamento numa contratação aceita.' using errcode = '22023';
    end if;

    if not exists (select 1 from public.profissionais p
                   where p.id = v_uid and p.status_aprovacao = 'aprovado') then
        raise exception 'Somente profissional aprovado envia orçamento.' using errcode = '22023';
    end if;

    if exists (select 1 from public.orcamentos o
               where o.contratacao_id = v_c.id and o.situacao = 'aprovado') then
        raise exception 'Esta contratação já tem um valor aprovado.' using errcode = '22023';
    end if;

    if exists (select 1 from public.orcamentos o
               where o.contratacao_id = v_c.id and o.situacao = 'aguardando') then
        raise exception 'Já existe um valor aguardando a resposta do cliente.' using errcode = '22023';
    end if;

    if p_valor_centavos is null or p_valor_centavos not between 100 and 10000000 then
        raise exception 'O valor precisa estar entre R$ 1,00 e R$ 100.000,00.' using errcode = '22023';
    end if;

    if char_length(v_obs) > 200 then
        raise exception 'A observação pode ter até 200 caracteres.' using errcode = '22023';
    end if;

    insert into public.orcamentos (contratacao_id, valor_centavos, observacao)
    values (v_c.id, p_valor_centavos, v_obs)
    returning * into v_novo;

    return jsonb_build_object('id', v_novo.id, 'situacao', v_novo.situacao, 'valor_centavos', v_novo.valor_centavos);
exception
    when unique_violation then
        -- Corrida entre duas abas: o índice único já garantiu a BR24.
        raise exception 'Já existe um valor aguardando a resposta do cliente.' using errcode = '22023';
end;
$$;

comment on function public.enviar_orcamento(bigint, integer, text) is
    'Profissional da contratação aceita envia um valor (BR24–BR26). Erros: 42501 (não é a parte), 22023 (regra).';


-- 4. Responder orçamento (cliente) -----------------------------------------------------------
create or replace function public.responder_orcamento(
    p_orcamento_id bigint,
    p_aprovar      boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_o   public.orcamentos%rowtype;
    v_c   public.contratacoes%rowtype;
begin
    if v_uid is null then
        raise exception 'É preciso estar logado para responder ao orçamento.' using errcode = '42501';
    end if;

    select * into v_o from public.orcamentos where id = p_orcamento_id for update;
    if found then
        select * into v_c from public.contratacoes where id = v_o.contratacao_id for update;
    end if;

    if v_o.id is null or v_c.cliente_id <> v_uid then
        raise exception 'Somente o cliente desta contratação responde ao orçamento.' using errcode = '42501';
    end if;

    if p_aprovar is null then
        raise exception 'Informe se o valor foi aprovado ou recusado.' using errcode = '22023';
    end if;

    if v_c.status <> 'aceita' then
        raise exception 'Esta contratação não está mais aceita.' using errcode = '22023';
    end if;

    if v_o.situacao <> 'aguardando' then
        raise exception 'Este orçamento já foi respondido.' using errcode = '22023';
    end if;

    update public.orcamentos
       set situacao = case when p_aprovar then 'aprovado' else 'recusado' end,
           respondido_em = now()
     where id = v_o.id
    returning * into v_o;

    return jsonb_build_object('id', v_o.id, 'situacao', v_o.situacao, 'valor_centavos', v_o.valor_centavos);
end;
$$;

comment on function public.responder_orcamento(bigint, boolean) is
    'Cliente da contratação aceita aprova ou recusa o orçamento aguardando (BR24, BR25). Erros: 42501 (não é a parte), 22023 (regra).';

revoke execute on function public.enviar_orcamento(bigint, integer, text) from public, anon;
revoke execute on function public.responder_orcamento(bigint, boolean) from public, anon;
grant execute on function public.enviar_orcamento(bigint, integer, text) to authenticated;
grant execute on function public.responder_orcamento(bigint, boolean) to authenticated;


-- 5. Realtime -----------------------------------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orcamentos') then
        alter publication supabase_realtime add table public.orcamentos;
    end if;
end;
$$;


-- 6. Autoconferência -------------------------------------------------------------------------
do $$
declare
    v_funcao text;
    v_priv   text;
begin
    if not (select relrowsecurity from pg_class where oid = 'public.orcamentos'::regclass) then
        raise exception '015: RLS desligado em orcamentos';
    end if;

    foreach v_priv in array array['INSERT', 'UPDATE', 'DELETE'] loop
        if has_table_privilege('authenticated', 'public.orcamentos', v_priv)
           or has_table_privilege('anon', 'public.orcamentos', v_priv) then
            raise exception '015: o app não pode escrever direto em orcamentos (%)', v_priv;
        end if;
    end loop;

    if has_table_privilege('anon', 'public.orcamentos', 'SELECT')
       or not has_table_privilege('authenticated', 'public.orcamentos', 'SELECT') then
        raise exception '015: só usuário logado lê orcamentos (e o RLS filtra as partes)';
    end if;

    if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'orcamentos') <> 1 then
        raise exception '015: orcamentos deve ter só a política de leitura das partes';
    end if;

    foreach v_funcao in array array['enviar_orcamento(bigint,integer,text)', 'responder_orcamento(bigint,boolean)'] loop
        if not exists (select 1 from pg_proc p
                       where p.oid = to_regprocedure('public.' || v_funcao)
                         and p.prosecdef
                         and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')) then
            raise exception '015: % precisa ser security definer com search_path fixo', v_funcao;
        end if;
        if has_function_privilege('anon', 'public.' || v_funcao, 'EXECUTE')
           or not has_function_privilege('authenticated', 'public.' || v_funcao, 'EXECUTE') then
            raise exception '015: % é só para usuário logado', v_funcao;
        end if;
    end loop;

    if (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'orcamentos'
          and indexname in ('orcamentos_um_aguardando', 'orcamentos_um_aprovado')) <> 2 then
        raise exception '015: faltam os índices de um aguardando e um aprovado (BR24)';
    end if;

    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orcamentos') then
        raise exception '015: orcamentos fora do Realtime';
    end if;
end;
$$;
