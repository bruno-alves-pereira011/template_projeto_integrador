-- =====================================================================
-- HelpMe — 003: papel de administrador (US-014; decisões D6 e D7)
--
-- O QUE FAZ:
--   1. Tabela administradores: quem tem linha aqui é administrador (BR11).
--      Admin NÃO é um tipo_usuario (BR05 continua igual) e só é criado
--      pelo SQL Editor (A09). Pelo app ninguém lê, cria, altera ou apaga
--      linhas aqui: RLS ligado e nenhuma política.
--   2. Função eh_admin(): o front e as políticas perguntam "quem chama é
--      admin?" sem precisar ler a tabela (NFR08).
--   3. validar_profissional: pelo app, só administrador muda
--      status_aprovacao; o próprio profissional continua barrado.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois do 001 e do 002. Não apaga
-- dados e pode ser rodado de novo. NÃO reaplique o 001 (D7): ele apaga as
-- tabelas e desfaz o 002 e este arquivo.
-- No final ele se confere sozinho: se algo ficou errado, dá ERRO.
--
-- DEPOIS DE RODAR: cadastre o primeiro admin (ver supabase/README.md).
-- =====================================================================


-- 1. Tabela ------------------------------------------------------------
create table if not exists public.administradores (
    usuario_id  uuid primary key references public.usuarios (id) on delete cascade,
    created_at  timestamptz not null default now()
);

comment on table public.administradores is
    'Administradores do HelpMe (BR11). Inserir/remover só pelo SQL Editor. Sem políticas de RLS de propósito.';

-- RLS ligado e NENHUMA política: anon/authenticated não leem nem escrevem.
-- Os privilégios também são retirados (defesa em profundidade: o Supabase
-- concede tudo em tabela nova do schema public).
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;


-- 2. eh_admin() ----------------------------------------------------------
-- security definer: lê administradores, que o app não pode ler.
-- stable: o resultado não muda dentro do mesmo comando (o Postgres pode
-- reaproveitar em políticas de RLS).
-- search_path fixo: ninguém troca "public.administradores" por outra tabela.
-- Só responde sobre QUEM CHAMA (auth.uid()); não recebe id como parâmetro,
-- então não serve para descobrir quem é admin.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.administradores a
        where a.usuario_id = (select auth.uid())
    );
$$;

-- anon também pode chamar (responde false): assim uma política futura que
-- use eh_admin() numa tabela pública não quebra a leitura do visitante.
revoke execute on function public.eh_admin() from public;
grant  execute on function public.eh_admin() to anon, authenticated;


-- 3. validar_profissional ------------------------------------------------
-- Igual à do 001, exceto a regra do status: agora um administrador pode
-- mudá-lo pelo app. (Quem pode atualizar QUAL linha continua sendo o RLS;
-- as políticas e funções de decisão do admin vêm na US-015.)
create or replace function public.validar_profissional()
returns trigger
language plpgsql
as $$
begin
    -- Maior de 18 anos (validado só quando a data é informada/alterada).
    if tg_op = 'INSERT' or new.data_nascimento is distinct from old.data_nascimento then
        if new.data_nascimento > (current_date - interval '18 years')::date then
            raise exception 'O profissional precisa ter 18 anos ou mais';
        end if;
    end if;

    if public.eh_papel_cliente_api() then
        if tg_op = 'INSERT' then
            -- Todo cadastro novo começa pendente.
            new.status_aprovacao := 'pendente';

            -- Só quem se cadastrou como profissional pode ter perfil aqui.
            if not exists (select 1 from public.usuarios u
                           where u.id = new.id and u.tipo_usuario = 'profissional') then
                raise exception 'Somente usuários do tipo profissional podem criar perfil profissional';
            end if;
        else
            -- BR11: pelo app, só administrador muda o status (D6).
            if new.status_aprovacao is distinct from old.status_aprovacao and not public.eh_admin() then
                raise exception 'status_aprovacao só pode ser alterado por um administrador';
            end if;
            if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
                raise exception 'id e created_at não podem ser alterados';
            end if;
        end if;
    end if;

    return new;
end;
$$;
-- O trigger profissionais_validar (001) já aponta para esta função pelo
-- nome; "create or replace" troca o corpo sem recriar o trigger.


-- 4. Autoconferência -----------------------------------------------------
do $$
declare
    v_politicas integer;
begin
    if not (select relrowsecurity from pg_class where oid = 'public.administradores'::regclass) then
        raise exception '003: RLS desligado em administradores';
    end if;

    select count(*) into v_politicas
    from pg_policies where schemaname = 'public' and tablename = 'administradores';
    if v_politicas > 0 then
        raise exception '003: administradores não pode ter políticas (encontradas: %)', v_politicas;
    end if;

    if has_table_privilege('authenticated', 'public.administradores', 'INSERT')
       or has_table_privilege('authenticated', 'public.administradores', 'SELECT')
       or has_table_privilege('anon', 'public.administradores', 'SELECT') then
        raise exception '003: anon/authenticated ainda têm privilégio em administradores';
    end if;

    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'eh_admin'
                     and p.prosecdef and p.provolatile = 's'
                     and p.proconfig @> array['search_path=public']) then
        raise exception '003: eh_admin() precisa ser security definer, stable e com search_path fixo';
    end if;

    if not exists (select 1 from pg_trigger
                   where tgname = 'profissionais_validar' and tgrelid = 'public.profissionais'::regclass) then
        raise exception '003: trigger profissionais_validar não encontrado (o 001 foi aplicado?)';
    end if;
end;
$$;
