-- =====================================================================
-- HelpMe — 001_schema.sql
-- Modelo de dados completo + segurança (RLS) + Realtime.
--
-- COMO USAR: copie e cole TUDO no SQL Editor do Supabase e clique em Run.
-- O script é idempotente: pode ser rodado de novo quantas vezes quiser.
-- ATENÇÃO: ele APAGA e recria as tabelas (decisão D3: o banco pode ser
-- recriado). Os usuários de Authentication NÃO são apagados.
-- =====================================================================


-- =====================================================================
-- 0. LIMPEZA (ordem inversa das dependências)
-- =====================================================================

-- O trigger fica na tabela auth.users (fora do schema public), por isso
-- precisa ser removido explicitamente antes da função.
drop trigger if exists on_auth_user_created on auth.users;

-- Triggers de versões antigas do projeto em auth.users (com outro nome),
-- que gravavam na tabela velha public.usuario e faziam TODO cadastro
-- falhar ("null value in column senha"). Remove qualquer trigger de
-- auth.users cuja função esteja no schema public; o nosso é recriado
-- na seção 2.1.
do $$
declare
    v_trigger record;
begin
    for v_trigger in
        select t.tgname
        from pg_trigger t
        join pg_proc p      on p.oid = t.tgfoid
        join pg_namespace n on n.oid = p.pronamespace
        where t.tgrelid = 'auth.users'::regclass
          and not t.tgisinternal
          and n.nspname = 'public'
    loop
        execute format('drop trigger if exists %I on auth.users', v_trigger.tgname);
    end loop;
end;
$$;

drop view  if exists public.profissionais_publicos;

drop table if exists public.mensagens              cascade;
drop table if exists public.contratacoes           cascade;
-- "pedidos" (pedido aberto para a categoria) foi substituído pela
-- contratação direta (decisão D5). O drop fica aqui para quem já rodou
-- a versão anterior deste script.
drop table if exists public.pedidos                cascade;
drop table if exists public.favoritos              cascade;
drop table if exists public.avaliacoes             cascade;
drop table if exists public.profissional_categoria cascade;
drop table if exists public.categorias             cascade;
drop table if exists public.profissionais          cascade;
drop table if exists public.usuarios               cascade;
-- Tabela antiga usada pela primeira versão do auth.js (id_usuario/id_profissional).
drop table if exists public.profissional           cascade;

drop function if exists public.handle_new_user()                         cascade;
drop function if exists public.eh_papel_cliente_api()                    cascade;
drop function if exists public.proteger_usuario()                        cascade;
drop function if exists public.validar_profissional()                    cascade;
drop function if exists public.validar_contratacao()                     cascade;
drop function if exists public.validar_mensagem()                        cascade;
drop function if exists public.contato_contraparte(bigint)               cascade;
-- Funções da versão anterior (fluxo de pedidos), removidas na D5.
drop function if exists public.validar_transicao_pedido()                cascade;
drop function if exists public.profissional_atende_categoria(bigint)     cascade;
drop function if exists public.compartilha_pedido(uuid)                  cascade;


-- =====================================================================
-- 1. TABELAS
-- =====================================================================

-- USUÁRIOS: perfil público de quem tem login. O id é o mesmo do
-- Supabase Auth, então apagar o login apaga o perfil (on delete cascade).
create table public.usuarios (
    id            uuid primary key references auth.users (id) on delete cascade,
    nome          text not null,
    tipo_usuario  text not null default 'cliente'
                  check (tipo_usuario in ('cliente', 'profissional')),
    telefone      text,
    created_at    timestamptz not null default now()
);

-- PROFISSIONAIS: especialização 1:1 de usuarios (mesmo id).
-- Só existe linha aqui para quem é prestador de serviço.
create table public.profissionais (
    id                uuid primary key references public.usuarios (id) on delete cascade,
    whatsapp          text,
    telefone          text,
    cidade            text,
    bairro            text,
    descricao         text,
    -- A regra "maior de 18" NÃO pode ser um CHECK: current_date muda todo
    -- dia e o Postgres exige que CHECK seja imutável. Ela é validada no
    -- trigger validar_profissional (seção 2).
    data_nascimento   date not null,
    status_aprovacao  text not null default 'pendente'
                      check (status_aprovacao in ('pendente', 'aprovado', 'recusado')),
    created_at        timestamptz not null default now()
);

-- CATEGORIAS: tipos de serviço. O slug é a "chave" usada no front
-- (ex.: profissionais.html?categoria=encanador).
create table public.categorias (
    id         bigint generated always as identity primary key,
    slug       text not null unique,
    nome       text not null,
    descricao  text,
    sigla      text not null,
    cor        text not null
);

-- PROFISSIONAL_CATEGORIA: relação N:N. Um profissional atua em 1+
-- categorias; uma categoria pode existir sem nenhum profissional.
create table public.profissional_categoria (
    profissional_id  uuid   not null references public.profissionais (id) on delete cascade,
    categoria_id     bigint not null references public.categorias (id)    on delete cascade,
    primary key (profissional_id, categoria_id)
);

-- AVALIAÇÕES: nota 1–5 + comentário opcional. Cada usuário avalia um
-- profissional no máximo uma vez (pode editar depois).
create table public.avaliacoes (
    id               bigint generated always as identity primary key,
    usuario_id       uuid not null references public.usuarios (id)      on delete cascade,
    profissional_id  uuid not null references public.profissionais (id) on delete cascade,
    nota             smallint not null check (nota between 1 and 5),
    comentario       text,
    created_at       timestamptz not null default now(),
    unique (usuario_id, profissional_id),
    -- Ninguém avalia a si mesmo (comparação simples, então pode ser CHECK).
    constraint avaliacoes_nao_autoavaliar check (usuario_id <> profissional_id)
);

-- FAVORITOS: lista pessoal de profissionais de cada usuário.
create table public.favoritos (
    usuario_id       uuid not null references public.usuarios (id)      on delete cascade,
    profissional_id  uuid not null references public.profissionais (id) on delete cascade,
    created_at       timestamptz not null default now(),
    primary key (usuario_id, profissional_id)
);

-- CONTRATAÇÕES (decisão D5): o cliente contrata um profissional
-- ESPECÍFICO a partir do perfil dele (substitui o antigo "pedido aberto
-- para a categoria"). Não há coluna com nome do cliente: ele vem de
-- usuarios (evita dado duplicado e respeita a BR07).
--
-- Sem categoria_id: a contratação é feita a um profissional, não a uma
-- categoria. Como ele pode atuar em várias, obrigar o cliente a escolher
-- uma seria um passo a mais sem uso no Marco 2 (nenhuma tela ou regra
-- depende disso). Se um relatório precisar, dá para adicionar depois
-- como coluna opcional sem quebrar nada.
create table public.contratacoes (
    id               bigint generated always as identity primary key,
    cliente_id       uuid   not null references public.usuarios (id)      on delete cascade,
    profissional_id  uuid   not null references public.profissionais (id) on delete cascade,
    descricao        text   not null,
    endereco         text   not null,
    -- "Não pode estar no passado" (BR09) depende de now(), que muda a
    -- todo instante, então não pode ser CHECK: é validado no trigger
    -- validar_contratacao (seção 2.5).
    data_desejada    timestamptz not null,
    status           text   not null default 'solicitada'
                     check (status in ('solicitada', 'aceita', 'recusada', 'cancelada', 'concluida')),
    created_at       timestamptz not null default now(),
    -- Atualizado pelo trigger a cada mudança de status.
    updated_at       timestamptz not null default now(),
    constraint contratacoes_nao_contratar_a_si check (cliente_id <> profissional_id)
);

-- MENSAGENS: chat de texto de cada contratação (FR14). Apagar a
-- contratação apaga a conversa.
create table public.mensagens (
    id               bigint generated always as identity primary key,
    contratacao_id   bigint not null references public.contratacoes (id) on delete cascade,
    autor_id         uuid   not null references public.usuarios (id)     on delete cascade,
    -- 1 a 1000 caracteres desconsiderando espaços nas pontas (NFR07):
    -- impede mensagem vazia ou só com espaços.
    conteudo         text   not null
                     check (char_length(trim(conteudo)) between 1 and 1000),
    created_at       timestamptz not null default now()
);

-- Índices nas colunas usadas em filtros/joins (as PKs já têm índice).
create index profissionais_status_idx          on public.profissionais (status_aprovacao);
create index profissional_categoria_cat_idx    on public.profissional_categoria (categoria_id);
create index avaliacoes_profissional_idx       on public.avaliacoes (profissional_id);
create index favoritos_profissional_idx        on public.favoritos (profissional_id);
create index contratacoes_cliente_idx          on public.contratacoes (cliente_id, created_at);
create index contratacoes_profissional_idx     on public.contratacoes (profissional_id, created_at);
-- O chat sempre busca "mensagens desta contratação em ordem cronológica".
create index mensagens_contratacao_idx         on public.mensagens (contratacao_id, created_at);


-- =====================================================================
-- 2. FUNÇÕES E TRIGGERS
-- =====================================================================

-- Diz se o comando veio do app (chave anon + usuário logado) ou de um
-- papel administrativo (postgres no SQL Editor/Table Editor, service_role).
-- Os triggers de proteção só se aplicam ao app; assim a equipe consegue
-- aprovar profissionais pelo painel e o seed.sql consegue rodar.
-- IMPORTANTE: NÃO pode ser security definer, senão current_user seria
-- sempre o dono da função.
create function public.eh_papel_cliente_api()
returns boolean
language sql
stable
as $$
    select current_user in ('anon', 'authenticated');
$$;


-- 2.1 Cria a linha em usuarios quando alguém se cadastra no Auth.
-- security definer: roda com permissão do dono (postgres), porque quem
-- dispara o trigger é o serviço de Auth, que não tem acesso a public.
-- search_path fixo evita que alguém "sequestre" nomes de tabela.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nome text;
    v_tipo text;
begin
    v_nome := nullif(trim(new.raw_user_meta_data ->> 'nome'), '');
    v_tipo := new.raw_user_meta_data ->> 'tipo_usuario';

    -- Valor ausente ou inválido vira 'cliente' (o tipo mais restrito).
    if v_tipo is null or v_tipo not in ('cliente', 'profissional') then
        v_tipo := 'cliente';
    end if;

    -- Sem nome no cadastro: usa a parte do e-mail antes do @.
    if v_nome is null then
        v_nome := split_part(coalesce(new.email, 'usuario'), '@', 1);
    end if;

    insert into public.usuarios (id, nome, tipo_usuario, telefone)
    values (new.id, v_nome, v_tipo, nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''))
    on conflict (id) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- 2.2 usuarios: o tipo (cliente/profissional) é escolhido no cadastro e
-- não pode ser trocado pelo próprio usuário depois (senão um cliente
-- viraria profissional sem passar pela aprovação).
create function public.proteger_usuario()
returns trigger
language plpgsql
as $$
begin
    if public.eh_papel_cliente_api() then
        if new.tipo_usuario is distinct from old.tipo_usuario then
            raise exception 'tipo_usuario não pode ser alterado depois do cadastro';
        end if;
        if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
            raise exception 'id e created_at não podem ser alterados';
        end if;
    end if;
    return new;
end;
$$;

create trigger usuarios_proteger
    before update on public.usuarios
    for each row execute function public.proteger_usuario();


-- 2.3 profissionais: idade mínima + proteção do status de aprovação.
--
-- Por que trigger e não "revoke update (status_aprovacao)"?
--   * No Supabase os papéis anon/authenticated recebem UPDATE na tabela
--     inteira; privilégio de coluna só funcionaria revogando o UPDATE geral
--     e liberando coluna por coluna (fácil de esquecer ao criar colunas).
--   * Privilégio de coluna não resolve o INSERT: precisamos FORÇAR
--     'pendente' mesmo que o front mande 'aprovado'.
--   * O trigger deixa a regra explícita e com mensagem de erro clara.
create function public.validar_profissional()
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
            -- Todo cadastro novo começa pendente (aprovação manual — D2).
            new.status_aprovacao := 'pendente';

            -- Só quem se cadastrou como profissional pode ter perfil aqui.
            if not exists (select 1 from public.usuarios u
                           where u.id = new.id and u.tipo_usuario = 'profissional') then
                raise exception 'Somente usuários do tipo profissional podem criar perfil profissional';
            end if;
        else
            if new.status_aprovacao is distinct from old.status_aprovacao then
                raise exception 'status_aprovacao só pode ser alterado pela equipe (painel do Supabase)';
            end if;
            if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
                raise exception 'id e created_at não podem ser alterados';
            end if;
        end if;
    end if;

    return new;
end;
$$;

create trigger profissionais_validar
    before insert or update on public.profissionais
    for each row execute function public.validar_profissional();


-- 2.4 contratacoes: regras de inserção e máquina de estados (BR06, BR09).
-- O RLS diz QUEM pode tentar inserir/atualizar; este trigger diz QUAL
-- mudança é permitida:
--   (a) solicitada -> aceita | recusada : só o profissional da contratação
--   (b) solicitada -> cancelada         : só o cliente
--   (c) aceita     -> concluida         : qualquer uma das partes
-- Qualquer outra transição, ou mudança em outro campo, é recusada.
-- Se cliente cancela e profissional aceita ao mesmo tempo, o Postgres
-- enfileira as duas: a segunda já enxerga o status novo e é recusada.
create function public.validar_contratacao()
returns trigger
language plpgsql
as $$
declare
    v_uid uuid := auth.uid();
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

    elsif old.status = 'aceita' and new.status = 'concluida' then
        if v_uid <> old.cliente_id and v_uid <> old.profissional_id then
            raise exception 'Somente as partes da contratação podem concluí-la';
        end if;

    else
        raise exception 'Transição de status inválida: % -> %', old.status, new.status;
    end if;

    return new;
end;
$$;

create trigger contratacoes_validar
    before insert or update on public.contratacoes
    for each row execute function public.validar_contratacao();


-- 2.5 mensagens: o horário vem sempre do servidor, para ninguém "furar"
-- a ordem cronológica do chat mandando um created_at falso.
create function public.validar_mensagem()
returns trigger
language plpgsql
as $$
begin
    if public.eh_papel_cliente_api() then
        new.created_at := now();
    end if;
    return new;
end;
$$;

create trigger mensagens_validar
    before insert on public.mensagens
    for each row execute function public.validar_mensagem();


-- 2.6 Contato da outra parte de uma contratação (BR07).
-- Por que função e não política em usuarios? RLS libera LINHAS inteiras:
-- uma política deixaria o profissional ler o telefone do cliente antes do
-- aceite. A função decide coluna a coluna:
--   * quem chama é o CLIENTE  -> nome, telefone e WhatsApp do profissional
--                                (já são públicos no diretório);
--   * quem chama é o PROFISSIONAL -> nome completo e telefone do cliente só
--                                com status 'aceita' ou 'concluida'; antes
--                                disso, apenas o primeiro nome.
-- Quem não é parte da contratação recebe zero linhas.
-- security definer: precisa ler usuarios de outra pessoa, o que o RLS do
-- chamador não permite; a regra acima é que limita o que sai.
create function public.contato_contraparte(p_contratacao_id bigint)
returns table (nome text, telefone text, whatsapp text, contato_liberado boolean)
language sql
stable
security definer
set search_path = public
as $$
    -- Visão do cliente: dados do profissional.
    select u.nome,
           coalesce(p.telefone, u.telefone),
           p.whatsapp,
           true
    from public.contratacoes c
    join public.usuarios u      on u.id = c.profissional_id
    join public.profissionais p on p.id = c.profissional_id
    where c.id = p_contratacao_id
      and c.cliente_id = auth.uid()

    union all

    -- Visão do profissional: dados do cliente (clientes não têm WhatsApp
    -- próprio no modelo, então o telefone serve para os dois botões).
    select case when c.status in ('aceita', 'concluida') then u.nome
                else split_part(trim(u.nome), ' ', 1) end,
           case when c.status in ('aceita', 'concluida') then u.telefone end,
           null::text,
           c.status in ('aceita', 'concluida')
    from public.contratacoes c
    join public.usuarios u on u.id = c.cliente_id
    where c.id = p_contratacao_id
      and c.profissional_id = auth.uid();
$$;


-- =====================================================================
-- 3. VIEW PARA O DIRETÓRIO (HU01–HU03)
-- Junta perfil + nome + categorias + média das notas em uma consulta só.
-- security_invoker = true: a view respeita o RLS de quem consulta (sem
-- isso ela rodaria como o dono e ignoraria as políticas).
-- Filtro por categoria no front: .contains('categorias', ['encanador'])
-- =====================================================================
create view public.profissionais_publicos
with (security_invoker = true) as
select
    p.id,
    u.nome,
    p.whatsapp,
    coalesce(p.telefone, u.telefone) as telefone,
    p.cidade,
    p.bairro,
    p.descricao,
    p.created_at,
    coalesce(array_agg(distinct c.slug) filter (where c.slug is not null), '{}') as categorias,
    (select round(avg(a.nota), 1) from public.avaliacoes a where a.profissional_id = p.id) as media_notas,
    (select count(*)              from public.avaliacoes a where a.profissional_id = p.id) as total_avaliacoes
from public.profissionais p
join public.usuarios u                    on u.id = p.id
left join public.profissional_categoria pc on pc.profissional_id = p.id
left join public.categorias c             on c.id = pc.categoria_id
where p.status_aprovacao = 'aprovado'
group by p.id, u.id;


-- =====================================================================
-- 4. SEGURANÇA — ROW LEVEL SECURITY
-- Com RLS ligado, NADA é permitido até existir uma política liberando.
-- Usamos (select auth.uid()) em vez de auth.uid() direto: o Postgres
-- calcula uma vez por consulta, e não uma vez por linha (recomendação
-- do Supabase para performance).
-- =====================================================================

alter table public.usuarios               enable row level security;
alter table public.profissionais          enable row level security;
alter table public.categorias             enable row level security;
alter table public.profissional_categoria enable row level security;
alter table public.avaliacoes             enable row level security;
alter table public.favoritos              enable row level security;
alter table public.contratacoes           enable row level security;
alter table public.mensagens              enable row level security;

-- ---------- usuarios ----------
-- Não há política de INSERT: a linha é criada pelo trigger do Auth.
create policy "usuarios: ler o proprio perfil"
    on public.usuarios for select to authenticated
    using (id = (select auth.uid()));

-- O diretório precisa mostrar o nome do profissional para qualquer visitante.
create policy "usuarios: perfil de profissional aprovado e publico"
    on public.usuarios for select to anon, authenticated
    using (exists (select 1 from public.profissionais p
                   where p.id = usuarios.id and p.status_aprovacao = 'aprovado'));

-- Não há política "partes se enxergam": o contato entre cliente e
-- profissional sai pela função contato_contraparte (seção 2.6), que
-- aplica a BR07 coluna a coluna.

create policy "usuarios: editar o proprio perfil"
    on public.usuarios for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

-- ---------- profissionais ----------
create policy "profissionais: aprovados sao publicos"
    on public.profissionais for select to anon, authenticated
    using (status_aprovacao = 'aprovado');

-- O dono sempre vê o próprio perfil (inclusive pendente/recusado,
-- para o front decidir se manda para bloqueio.html).
create policy "profissionais: dono le o proprio"
    on public.profissionais for select to authenticated
    using (id = (select auth.uid()));

create policy "profissionais: dono cria o proprio"
    on public.profissionais for insert to authenticated
    with check (id = (select auth.uid()));

create policy "profissionais: dono edita o proprio"
    on public.profissionais for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

-- ---------- categorias ----------
-- Somente leitura. Criar/editar categoria só pelo painel (postgres).
create policy "categorias: leitura publica"
    on public.categorias for select to anon, authenticated
    using (true);

-- ---------- profissional_categoria ----------
create policy "profissional_categoria: leitura publica"
    on public.profissional_categoria for select to anon, authenticated
    using (true);

create policy "profissional_categoria: dono adiciona"
    on public.profissional_categoria for insert to authenticated
    with check (profissional_id = (select auth.uid()));

create policy "profissional_categoria: dono remove"
    on public.profissional_categoria for delete to authenticated
    using (profissional_id = (select auth.uid()));

-- ---------- avaliacoes ----------
create policy "avaliacoes: leitura publica"
    on public.avaliacoes for select to anon, authenticated
    using (true);

-- Só avalia em nome próprio e só profissional aprovado.
-- (autoavaliação é barrada pelo CHECK avaliacoes_nao_autoavaliar)
create policy "avaliacoes: autor cria"
    on public.avaliacoes for insert to authenticated
    with check (
        usuario_id = (select auth.uid())
        and exists (select 1 from public.profissionais p
                    where p.id = profissional_id and p.status_aprovacao = 'aprovado')
    );

create policy "avaliacoes: autor edita"
    on public.avaliacoes for update to authenticated
    using (usuario_id = (select auth.uid()))
    with check (
        usuario_id = (select auth.uid())
        and exists (select 1 from public.profissionais p
                    where p.id = profissional_id and p.status_aprovacao = 'aprovado')
    );

create policy "avaliacoes: autor apaga"
    on public.avaliacoes for delete to authenticated
    using (usuario_id = (select auth.uid()));

-- ---------- favoritos ----------
create policy "favoritos: tudo pelo dono"
    on public.favoritos for all to authenticated
    using (usuario_id = (select auth.uid()))
    with check (usuario_id = (select auth.uid()));

-- ---------- contratacoes ----------
-- Só as duas partes enxergam a contratação.
create policy "contratacoes: leitura pelas partes"
    on public.contratacoes for select to authenticated
    using (
        cliente_id = (select auth.uid())
        or profissional_id = (select auth.uid())
    );

-- BR10: só CLIENTE contrata, em nome próprio, começando em 'solicitada',
-- e só profissional APROVADO pode ser contratado.
create policy "contratacoes: cliente contrata profissional aprovado"
    on public.contratacoes for insert to authenticated
    with check (
        cliente_id = (select auth.uid())
        and status = 'solicitada'
        and exists (select 1 from public.usuarios u
                    where u.id = (select auth.uid()) and u.tipo_usuario = 'cliente')
        and exists (select 1 from public.profissionais p
                    where p.id = profissional_id and p.status_aprovacao = 'aprovado')
    );

-- Quem pode TENTAR atualizar; as transições válidas ficam no trigger 2.4.
create policy "contratacoes: partes atualizam"
    on public.contratacoes for update to authenticated
    using (
        cliente_id = (select auth.uid())
        or profissional_id = (select auth.uid())
    )
    with check (
        cliente_id = (select auth.uid())
        or profissional_id = (select auth.uid())
    );
-- Sem política de DELETE: contratação nunca é apagada pelo app
-- (ela termina como recusada, cancelada ou concluída).

-- ---------- mensagens ----------
-- BR08: só as partes da contratação leem o chat (o histórico continua
-- legível depois que ela termina).
create policy "mensagens: partes leem"
    on public.mensagens for select to authenticated
    using (exists (
        select 1 from public.contratacoes c
        where c.id = contratacao_id
          and (c.cliente_id = (select auth.uid()) or c.profissional_id = (select auth.uid()))
    ));

-- BR08: só as partes escrevem, em nome próprio, e só enquanto a
-- contratação está 'solicitada' ou 'aceita'.
create policy "mensagens: partes enviam enquanto ativa"
    on public.mensagens for insert to authenticated
    with check (
        autor_id = (select auth.uid())
        and exists (
            select 1 from public.contratacoes c
            where c.id = contratacao_id
              and (c.cliente_id = (select auth.uid()) or c.profissional_id = (select auth.uid()))
              and c.status in ('solicitada', 'aceita')
        )
    );
-- Sem UPDATE e sem DELETE: mensagem enviada não é editada nem apagada.


-- =====================================================================
-- 5. PERMISSÕES (GRANTS)
-- O Supabase já costuma conceder isso por padrão; repetimos para o
-- script não depender da configuração do projeto. Quem filtra as linhas
-- é o RLS acima.
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant select on public.categorias, public.profissionais, public.profissional_categoria,
                public.avaliacoes, public.usuarios, public.profissionais_publicos
    to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- contato_contraparte só faz sentido para usuário logado (chamada pelo
-- front com supabaseClient.rpc('contato_contraparte', { p_contratacao_id })).
revoke execute on function public.contato_contraparte(bigint) from public, anon;
grant  execute on function public.contato_contraparte(bigint) to authenticated;


-- =====================================================================
-- 6. REALTIME
-- As listas de contratações (cliente e profissional) e o chat atualizam
-- sozinhos. O Realtime respeita o RLS: cada um só recebe eventos das
-- linhas que pode ler. O DO evita erro se a tabela já estiver na
-- publicação. (A antiga "pedidos" saiu da publicação ao ser dropada.)
-- =====================================================================
do $$
declare
    v_tabela text;
begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;

    foreach v_tabela in array array['contratacoes', 'mensagens'] loop
        if not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime'
                         and schemaname = 'public'
                         and tablename = v_tabela) then
            execute format('alter publication supabase_realtime add table public.%I', v_tabela);
        end if;
    end loop;
end;
$$;


-- =====================================================================
-- 7. DADOS INICIAIS
-- =====================================================================

-- Categorias: mesmos nomes/siglas/cores/descrições de helpme-app/js/cliente.js.
insert into public.categorias (slug, nome, sigla, cor, descricao) values
    ('encanador',   'Encanador',   'EN', '#13695f', 'Vazamentos, entupimentos, torneiras e instalações hidráulicas.'),
    ('eletricista', 'Eletricista', 'EL', '#d0901f', 'Tomadas, disjuntores, chuveiros e instalações elétricas.'),
    ('chaveiro',    'Chaveiro',    'CH', '#4c5aa8', 'Abertura de portas, cópias de chaves e troca de fechaduras.'),
    ('pedreiro',    'Pedreiro',    'PD', '#b8532e', 'Reformas, rachaduras, pisos, azulejos e alvenaria.'),
    ('pintor',      'Pintor',      'PT', '#8b4775', 'Pintura de paredes, portões, fachadas e acabamentos.'),
    ('gesseiro',    'Gesseiro',    'GS', '#47707e', 'Forros, sancas, divisórias e reparos em gesso.');

-- Recria o perfil de quem já tinha login antes deste script rodar
-- (a tabela usuarios acabou de ser recriada vazia). Assim a ordem
-- "criar usuários no painel" x "rodar o schema" deixa de importar.
insert into public.usuarios (id, nome, tipo_usuario)
select
    au.id,
    coalesce(nullif(trim(au.raw_user_meta_data ->> 'nome'), ''), split_part(coalesce(au.email, 'usuario'), '@', 1)),
    case when au.raw_user_meta_data ->> 'tipo_usuario' in ('cliente', 'profissional')
         then au.raw_user_meta_data ->> 'tipo_usuario'
         else 'cliente' end
from auth.users au
on conflict (id) do nothing;
