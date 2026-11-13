-- =====================================================================
-- HelpMe — 004: fila de análise e decisão do administrador (US-015)
-- Requisitos: FR17, FR18, FR19, BR15, BR16, BR19, BR21, NFR10. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. Tabela analises_profissional: histórico de triagem (US-016) e de
--      decisões (aprovação, recusa, reenvio). O app NÃO lê nem escreve
--      direto: RLS ligado, nenhuma política, privilégios revogados.
--   2. fila_analise(): lista dos pendentes para o admin (só as colunas
--      que a tela usa).
--   3. detalhe_profissional_admin(id): perfil, última triagem e histórico.
--   4. decidir_profissionais(ids, acao, motivo, exigir_verde): aprova ou
--      recusa conferindo tudo no banco no momento da ação (BR15, BR16) e
--      grava o histórico (BR19). Devolve o que foi feito e o que foi
--      ignorado, com o motivo.
--   5. validar_profissional: admin não muda o PRÓPRIO status pela API.
--      Com isso, toda mudança de status feita pelo app passa por
--      decidir_profissionais e fica no histórico (NFR10).
--
-- POR QUE FUNÇÕES E NÃO POLÍTICAS DE SELECT PARA O ADMIN?
--   Uma política em usuarios libera a linha inteira (inclusive telefone de
--   clientes). As funções devolvem só o necessário e nunca tocam em
--   mensagens (BR21).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois do 003. Não apaga dados e
-- pode ser rodado de novo. Se outra migration já tiver usado o número 004
-- (ex.: DEBT-009), renomeie para o próximo número livre antes do merge.
-- No final ele se confere sozinho: se algo ficou errado, dá ERRO.
-- =====================================================================


-- 1. Histórico ----------------------------------------------------------
-- acao:
--   'triagem'   -> gravada pelo sistema (US-016); resultado obrigatório.
--   'aprovacao' -> admin aprovou.
--   'recusa'    -> admin recusou; motivo de 10 a 500 caracteres (BR16).
--   'reenvio'   -> profissional recusado reenviou para análise (US-013).
-- autor_id nulo = sistema (triagem).
-- checagens (só triagem), formato combinado com a US-016:
--   [{"codigo": "descricao_min", "tipo": "obrigatoria"|"suspeita",
--     "ok": false, "mensagem": "Descrição com menos de 30 caracteres"}]
create table if not exists public.analises_profissional (
    id               bigint generated always as identity primary key,
    profissional_id  uuid not null references public.profissionais (id) on delete cascade,
    acao             text not null
                     check (acao in ('triagem', 'aprovacao', 'recusa', 'reenvio')),
    resultado        text
                     check (resultado in ('verde', 'pendencia', 'suspeito')),
    checagens        jsonb,
    autor_id         uuid references public.usuarios (id) on delete set null,
    motivo           text,
    created_at       timestamptz not null default now(),
    constraint analises_resultado_so_na_triagem
        check ((acao = 'triagem') = (resultado is not null)),
    constraint analises_motivo_da_recusa
        check (acao <> 'recusa' or char_length(trim(coalesce(motivo, ''))) between 10 and 500)
);

create index if not exists analises_profissional_idx
    on public.analises_profissional (profissional_id, created_at desc);

comment on table public.analises_profissional is
    'Histórico de triagem e decisões (BR19). O app só acessa pelas funções da 004; não é editado nem apagado pelo app.';

alter table public.analises_profissional enable row level security;
revoke all on public.analises_profissional from anon, authenticated;


-- Erro padrão quando quem chama não é admin (o front mostra "sem permissão").
-- errcode 42501 = insufficient_privilege.
create or replace function public.exigir_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
    if not public.eh_admin() then
        raise exception 'Apenas administradores podem acessar a análise de profissionais'
            using errcode = '42501';
    end if;
end;
$$;


-- 2. Fila ---------------------------------------------------------------
-- na_fila_desde: último reenvio (US-013) ou, se não houver, o cadastro.
-- triagem: resultado da última triagem ou null ("sem triagem").
create or replace function public.fila_analise()
returns table (
    id               uuid,
    nome             text,
    cidade           text,
    bairro           text,
    categorias       text[],
    na_fila_desde    timestamptz,
    triagem          text,
    triagem_motivos  text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
    perform public.exigir_admin();

    return query
    select p.id,
           u.nome,
           p.cidade,
           p.bairro,
           coalesce((select array_agg(c.nome order by c.nome)
                     from public.profissional_categoria pc
                     join public.categorias c on c.id = pc.categoria_id
                     where pc.profissional_id = p.id), '{}'),
           coalesce((select max(a.created_at) from public.analises_profissional a
                     where a.profissional_id = p.id and a.acao = 'reenvio'), p.created_at),
           t.resultado,
           coalesce((select array_agg(ch ->> 'mensagem')
                     from jsonb_array_elements(coalesce(t.checagens, '[]'::jsonb)) ch
                     where (ch ->> 'ok')::boolean is false), '{}')
    from public.profissionais p
    join public.usuarios u on u.id = p.id
    left join lateral (
        select a.resultado, a.checagens
        from public.analises_profissional a
        where a.profissional_id = p.id and a.acao = 'triagem'
        order by a.created_at desc, a.id desc
        limit 1
    ) t on true
    where p.status_aprovacao = 'pendente'
    order by 6;
end;
$$;


-- 3. Detalhe -------------------------------------------------------------
-- Devolve null se o profissional não existe. Idade em anos (não a data de
-- nascimento: dado pessoal, 002). Histórico com o nome do autor.
create or replace function public.detalhe_profissional_admin(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_resultado jsonb;
begin
    perform public.exigir_admin();

    select jsonb_build_object(
        'id',               p.id,
        'nome',             u.nome,
        'status',           p.status_aprovacao,
        'cidade',           p.cidade,
        'bairro',           p.bairro,
        'descricao',        p.descricao,
        'whatsapp',         p.whatsapp,
        'telefone',         coalesce(p.telefone, u.telefone),
        'idade',            extract(year from age(current_date, p.data_nascimento))::int,
        'cadastrado_em',    p.created_at,
        'categorias',       coalesce((select jsonb_agg(c.nome order by c.nome)
                                      from public.profissional_categoria pc
                                      join public.categorias c on c.id = pc.categoria_id
                                      where pc.profissional_id = p.id), '[]'::jsonb),
        'triagem',          (select jsonb_build_object('resultado', a.resultado,
                                                       'checagens', coalesce(a.checagens, '[]'::jsonb),
                                                       'em', a.created_at)
                             from public.analises_profissional a
                             where a.profissional_id = p.id and a.acao = 'triagem'
                             order by a.created_at desc, a.id desc
                             limit 1),
        'historico',        coalesce((select jsonb_agg(jsonb_build_object(
                                                'acao', a.acao,
                                                'resultado', a.resultado,
                                                'motivo', a.motivo,
                                                'autor', case when a.autor_id is null then 'Sistema (triagem)'
                                                              else coalesce(au.nome, 'Administrador removido') end,
                                                'em', a.created_at)
                                            order by a.created_at desc, a.id desc)
                                      from public.analises_profissional a
                                      left join public.usuarios au on au.id = a.autor_id
                                      where a.profissional_id = p.id), '[]'::jsonb)
    )
    into v_resultado
    from public.profissionais p
    join public.usuarios u on u.id = p.id
    where p.id = p_id;

    return v_resultado;
end;
$$;


-- 4. Decisão --------------------------------------------------------------
-- p_acao: 'aprovar' | 'recusar'.
-- p_exigir_verde: true na aprovação em lote da fila (BR15: só última triagem verde).
-- Recusa: um profissional por vez e motivo de 10 a 500 caracteres (BR16).
-- Concorrência (critério 5): cada linha é travada (FOR UPDATE). Se outro admin
-- decidiu antes, o status já não é 'pendente' e o item volta como 'ignorado'.
create or replace function public.decidir_profissionais(
    p_ids           uuid[],
    p_acao          text,
    p_motivo        text default null,
    p_exigir_verde  boolean default false
)
returns table (profissional_id uuid, nome text, situacao text, detalhe text)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
    v_admin   uuid := auth.uid();
    v_motivo  text := nullif(trim(coalesce(p_motivo, '')), '');
    v_id      uuid;
    v_status  text;
    v_nome    text;
    v_triagem text;
begin
    perform public.exigir_admin();

    if p_acao is null or p_acao not in ('aprovar', 'recusar') then
        raise exception 'Ação inválida: use aprovar ou recusar' using errcode = '22023';
    end if;

    if p_ids is null or cardinality(p_ids) = 0 then
        raise exception 'Nenhum profissional selecionado' using errcode = '22023';
    end if;

    if cardinality(p_ids) > 100 then
        raise exception 'Selecione no máximo 100 profissionais por vez' using errcode = '22023';
    end if;

    if p_acao = 'recusar' then
        if cardinality(p_ids) <> 1 then
            raise exception 'Recuse um profissional por vez' using errcode = '22023';
        end if;
        if v_motivo is null or char_length(v_motivo) not between 10 and 500 then
            raise exception 'O motivo da recusa precisa ter de 10 a 500 caracteres' using errcode = '22023';
        end if;
    end if;

    foreach v_id in array (select array_agg(distinct x) from unnest(p_ids) x) loop
        select p.status_aprovacao, u.nome
          into v_status, v_nome
          from public.profissionais p
          join public.usuarios u on u.id = p.id
         where p.id = v_id
           for update of p;

        if not found then
            profissional_id := v_id; nome := null; situacao := 'ignorado';
            detalhe := 'Cadastro não encontrado';
            return next;
            continue;
        end if;

        profissional_id := v_id;
        nome := v_nome;

        if v_id = v_admin then
            situacao := 'ignorado'; detalhe := 'Um administrador não decide o próprio cadastro';
            return next;
            continue;
        end if;

        if v_status <> 'pendente' then
            situacao := 'ignorado'; detalhe := 'Já foi decidido (status atual: ' || v_status || ')';
            return next;
            continue;
        end if;

        if p_acao = 'aprovar' and p_exigir_verde then
            select a.resultado into v_triagem
              from public.analises_profissional a
             where a.profissional_id = v_id and a.acao = 'triagem'
             order by a.created_at desc, a.id desc
             limit 1;

            if v_triagem is distinct from 'verde' then
                situacao := 'ignorado';
                detalhe := case when v_triagem is null then 'Sem triagem'
                                else 'Triagem: ' || v_triagem end;
                return next;
                continue;
            end if;
        end if;

        -- Roda como dono da função (não como authenticated): o trigger
        -- validar_profissional não barra, e o histórico é gravado aqui.
        update public.profissionais
           set status_aprovacao = case when p_acao = 'aprovar' then 'aprovado' else 'recusado' end
         where id = v_id;

        insert into public.analises_profissional (profissional_id, acao, autor_id, motivo)
        values (v_id,
                case when p_acao = 'aprovar' then 'aprovacao' else 'recusa' end,
                v_admin,
                case when p_acao = 'recusar' then v_motivo end);

        situacao := case when p_acao = 'aprovar' then 'aprovado' else 'recusado' end;
        detalhe := null;
        return next;
    end loop;
end;
$$;


-- Permissões: só usuário logado chama; quem não é admin recebe 42501 (critério 7).
revoke execute on function public.exigir_admin()                                        from public, anon;
revoke execute on function public.fila_analise()                                        from public, anon;
revoke execute on function public.detalhe_profissional_admin(uuid)                      from public, anon;
revoke execute on function public.decidir_profissionais(uuid[], text, text, boolean)    from public, anon;
grant  execute on function public.fila_analise()                                        to authenticated;
grant  execute on function public.detalhe_profissional_admin(uuid)                      to authenticated;
grant  execute on function public.decidir_profissionais(uuid[], text, text, boolean)    to authenticated;
-- exigir_admin() é chamada só de dentro das funções acima (que rodam como dono).
revoke execute on function public.exigir_admin() from authenticated;


-- 5. validar_profissional ----------------------------------------------------
-- Igual à da 003, exceto: o admin não muda o PRÓPRIO status pela API. Como
-- nenhum admin tem política de UPDATE na linha de outro profissional, na
-- prática toda mudança de status pelo app passa por decidir_profissionais
-- (que roda como dono e grava o histórico — NFR10).
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
            -- BR11: pelo app, só administrador muda o status (D6), e nunca o próprio (004).
            if new.status_aprovacao is distinct from old.status_aprovacao
               and (not public.eh_admin() or new.id = (select auth.uid())) then
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


-- 6. Autoconferência -----------------------------------------------------------
do $$
declare
    v_funcao text;
begin
    if not (select relrowsecurity from pg_class where oid = 'public.analises_profissional'::regclass) then
        raise exception '004: RLS desligado em analises_profissional';
    end if;

    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'analises_profissional') then
        raise exception '004: analises_profissional não pode ter políticas';
    end if;

    if has_table_privilege('authenticated', 'public.analises_profissional', 'SELECT')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'INSERT')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'UPDATE')
       or has_table_privilege('authenticated', 'public.analises_profissional', 'DELETE') then
        raise exception '004: authenticated ainda tem privilégio em analises_profissional';
    end if;

    foreach v_funcao in array array['fila_analise', 'detalhe_profissional_admin', 'decidir_profissionais', 'exigir_admin'] loop
        if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'public' and p.proname = v_funcao
                         and p.prosecdef and p.proconfig @> array['search_path=public']) then
            raise exception '004: %() precisa ser security definer com search_path fixo', v_funcao;
        end if;
    end loop;

    if has_function_privilege('anon', 'public.decidir_profissionais(uuid[], text, text, boolean)', 'EXECUTE') then
        raise exception '004: anon não pode chamar decidir_profissionais';
    end if;
end;
$$;
