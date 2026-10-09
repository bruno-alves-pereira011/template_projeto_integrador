-- =====================================================================
-- HelpMe — seed.sql (dados de TESTE)
--
-- ANTES DE RODAR:
--   1. Rode supabase/migrations/001_schema.sql.
--   2. No painel do Supabase, vá em Authentication → Users → Add user →
--      "Create new user", marque "Auto Confirm User" e crie os 4 logins
--      abaixo (a senha é livre; sugestão: Helpme@123):
--         cliente@helpme.test   -> cliente
--         prof1@helpme.test     -> profissional APROVADO (encanador)
--         prof2@helpme.test     -> profissional APROVADO (eletricista + chaveiro)
--         prof3@helpme.test     -> profissional PENDENTE (pintor)
--   3. Cole este arquivo no SQL Editor e clique em Run.
--
-- Por que funciona: o SQL Editor roda como o papel "postgres", que ignora
-- o RLS (dono das tabelas) e é liberado pelos triggers de proteção
-- (eh_papel_cliente_api() = false). Por isso aqui conseguimos marcar
-- profissionais como 'aprovado', o que o app nunca consegue.
--
-- Idempotente: pode rodar várias vezes; ele atualiza em vez de duplicar.
-- =====================================================================

do $$
declare
    v_cliente uuid;
    v_prof1   uuid;
    v_prof2   uuid;
    v_prof3   uuid;
    v_contratacao bigint;
begin
    -- Os ids vêm do Auth (cada projeto gera ids diferentes).
    select id into v_cliente from auth.users where email = 'cliente@helpme.test';
    select id into v_prof1   from auth.users where email = 'prof1@helpme.test';
    select id into v_prof2   from auth.users where email = 'prof2@helpme.test';
    select id into v_prof3   from auth.users where email = 'prof3@helpme.test';

    if v_cliente is null or v_prof1 is null or v_prof2 is null or v_prof3 is null then
        raise exception 'Crie antes os 4 usuários de teste em Authentication → Users (veja o topo do seed.sql).';
    end if;

    -- 1. Perfis em usuarios. O trigger do Auth já criou as linhas (como
    --    'cliente'); aqui acertamos nome/tipo. O "on conflict" também cobre
    --    o caso de a linha não existir.
    insert into public.usuarios (id, nome, tipo_usuario, telefone) values
        (v_cliente, 'Ana Paula Rocha',  'cliente',      '(11) 98888-0001'),
        (v_prof1,   'João Encanador',   'profissional', '(11) 97777-0001'),
        (v_prof2,   'Marcos Eletricista','profissional', '(11) 97777-0002'),
        (v_prof3,   'Paula Pintora',    'profissional', '(11) 97777-0003')
    on conflict (id) do update
        set nome = excluded.nome,
            tipo_usuario = excluded.tipo_usuario,
            telefone = excluded.telefone;

    -- 2. Perfis profissionais (2 aprovados, 1 pendente).
    insert into public.profissionais
        (id, whatsapp, telefone, cidade, bairro, descricao, data_nascimento, status_aprovacao) values
        (v_prof1, '5511977770001', '(11) 97777-0001', 'São Paulo', 'Centro',
         'Encanador há 15 anos. Atendo vazamentos e entupimentos no mesmo dia.', '1980-05-10', 'aprovado'),
        (v_prof2, '5511977770002', '(11) 97777-0002', 'São Paulo', 'Vila Mariana',
         'Eletricista residencial e chaveiro 24h.', '1990-11-23', 'aprovado'),
        (v_prof3, '5511977770003', '(11) 97777-0003', 'Guarulhos', 'Jardim América',
         'Pintura interna e externa.', '1995-02-02', 'pendente')
    on conflict (id) do update
        set whatsapp = excluded.whatsapp,
            telefone = excluded.telefone,
            cidade = excluded.cidade,
            bairro = excluded.bairro,
            descricao = excluded.descricao,
            data_nascimento = excluded.data_nascimento,
            status_aprovacao = excluded.status_aprovacao;

    -- 3. Categorias de cada profissional.
    insert into public.profissional_categoria (profissional_id, categoria_id)
    select v.pid, c.id
    from (values (v_prof1, 'encanador'),
                 (v_prof2, 'eletricista'),
                 (v_prof2, 'chaveiro'),
                 (v_prof3, 'pintor')) as v(pid, slug)
    join public.categorias c on c.slug = v.slug
    on conflict do nothing;

    -- 4. Avaliações da cliente.
    insert into public.avaliacoes (usuario_id, profissional_id, nota, comentario) values
        (v_cliente, v_prof1, 5, 'Chegou rápido e resolveu o vazamento. Recomendo!'),
        (v_cliente, v_prof2, 4, null)
    on conflict (usuario_id, profissional_id) do update
        set nota = excluded.nota,
            comentario = excluded.comentario;

    -- 5. Favorito da cliente.
    insert into public.favoritos (usuario_id, profissional_id) values (v_cliente, v_prof1)
    on conflict do nothing;

    -- 6. Uma contratação 'solicitada' da cliente para o prof1, daqui a 2
    --    dias (aparece em "solicitações recebidas" do prof1).
    --    Apaga as contratações antigas da cliente de teste para não
    --    acumular (as mensagens vão junto, por cascade).
    delete from public.contratacoes where cliente_id = v_cliente;

    insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
    values (v_cliente, v_prof1,
            'Vazamento embaixo da pia da cozinha, a água está escorrendo pelo armário.',
            'Rua das Palmeiras, 152 - Centro',
            now() + interval '2 days')
    returning id into v_contratacao;

    -- 7. Duas mensagens no chat dessa contratação.
    insert into public.mensagens (contratacao_id, autor_id, conteudo, created_at) values
        (v_contratacao, v_cliente, 'Oi, João! Consegue vir no período da manhã?', now() - interval '10 minutes'),
        (v_contratacao, v_prof1,   'Bom dia, Ana! Consigo sim, chego por volta das 9h.', now() - interval '5 minutes');
end;
$$;

-- Conferência rápida
select u.nome, u.tipo_usuario, p.status_aprovacao
from public.usuarios u
left join public.profissionais p on p.id = u.id
order by u.tipo_usuario, u.nome;
