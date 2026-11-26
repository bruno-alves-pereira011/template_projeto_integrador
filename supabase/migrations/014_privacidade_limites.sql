-- =====================================================================
-- HelpMe — 014: telefone pessoal fechado e limites de tamanho (DEBT-010)
-- Achados H2 e H3 da banca de revisão de 2026-11-26. Requisitos: NFR01,
-- BR07 e a regra "validação redundante: frontend + backend" das
-- coding-standards.
--
-- O QUE FAZ:
--   1. Visitante e usuário logado deixam de ler usuarios.telefone de outra
--      pessoa. Antes, a política "perfil de profissional aprovado e publico"
--      (001) junto com o grant de SELECT na tabela inteira entregava pela
--      API o telefone do CADASTRO de todo profissional aprovado, mesmo
--      quando ele tinha informado outro telefone no perfil.
--        anon          lê só (id, nome)
--        authenticated lê só (id, nome, tipo_usuario, created_at)
--      O privilégio de coluna vale para todas as linhas; o RLS continua
--      escolhendo quais linhas.
--   2. A view profissionais_publicos continua igual por fora (mesmas
--      colunas): o telefone de contato agora vem de telefone_publico(),
--      que devolve coalesce(perfil, cadastro) só de profissional aprovado,
--      como a view já fazia.
--   3. O dono lê o próprio telefone por meu_telefone() (meu-perfil e
--      sessao.js). O UPDATE do próprio perfil continua pela tabela.
--   4. Limites de tamanho no banco, iguais aos maxlength das telas:
--        usuarios      nome 120, telefone 20
--        profissionais whatsapp 20, telefone 20, cidade 80, bairro 80,
--                      descricao 500
--        contratacoes  descricao 1000, endereco 200
--        avaliacoes    comentario 500 (ainda sem tela; Marco 3)
--      Os dados atuais cabem (conferido por leitura em 2026-11-26: maior
--      nome 18, maior descrição de perfil 87).
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 013. Não apaga dados e
-- pode ser rodado de novo. No final ele se confere sozinho.
-- FRONT JUNTO: o front desta branch lê o telefone por meu_telefone(). O
-- front antigo pede usuarios.telefone pela tabela e, depois desta
-- migration, dá erro ao abrir Meu perfil e Completar perfil. O front
-- novo, antes desta migration, também dá erro nessas duas telas (a função
-- ainda não existe). Aplique a 014 e publique o front no mesmo momento.
-- =====================================================================


-- 1. Telefone de contato do diretório ------------------------------------------------
create or replace function public.telefone_publico(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(p.telefone, u.telefone)
      from public.profissionais p
      join public.usuarios u on u.id = p.id
     where p.id = p_id
       and p.status_aprovacao = 'aprovado';
$$;

comment on function public.telefone_publico(uuid) is
    'Telefone de contato que o diretório mostra (perfil, senão cadastro). Só de profissional aprovado; null para os demais (014).';

revoke execute on function public.telefone_publico(uuid) from public;
grant execute on function public.telefone_publico(uuid) to anon, authenticated;

-- Mesmas colunas, na mesma ordem: só muda de onde vem o telefone.
create or replace view public.profissionais_publicos
with (security_invoker = true) as
select
    p.id,
    u.nome,
    p.whatsapp,
    public.telefone_publico(p.id) as telefone,
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


-- 2. O dono lê o próprio telefone ------------------------------------------------------
create or replace function public.meu_telefone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select u.telefone from public.usuarios u where u.id = (select auth.uid());
$$;

comment on function public.meu_telefone() is
    'Telefone do cadastro de quem está logado (Meu perfil). usuarios.telefone não é lido pela tabela (014).';

revoke execute on function public.meu_telefone() from public, anon;
grant execute on function public.meu_telefone() to authenticated;


-- 3. Privilégio de coluna em usuarios ---------------------------------------------------
-- Revoga a tabela inteira e também a coluna (um grant de coluna feito à
-- parte não sai com o revoke da tabela).
revoke select on public.usuarios from anon, authenticated;
revoke select (telefone) on public.usuarios from anon, authenticated;
grant select (id, nome) on public.usuarios to anon;
grant select (id, nome, tipo_usuario, created_at) on public.usuarios to authenticated;


-- 4. Limites de tamanho ----------------------------------------------------------------
alter table public.usuarios drop constraint if exists usuarios_nome_tamanho;
alter table public.usuarios drop constraint if exists usuarios_telefone_tamanho;
alter table public.usuarios
    add constraint usuarios_nome_tamanho     check (char_length(nome) <= 120),
    add constraint usuarios_telefone_tamanho check (char_length(telefone) <= 20);

alter table public.profissionais drop constraint if exists profissionais_whatsapp_tamanho;
alter table public.profissionais drop constraint if exists profissionais_telefone_tamanho;
alter table public.profissionais drop constraint if exists profissionais_cidade_tamanho;
alter table public.profissionais drop constraint if exists profissionais_bairro_tamanho;
alter table public.profissionais drop constraint if exists profissionais_descricao_tamanho;
alter table public.profissionais
    add constraint profissionais_whatsapp_tamanho  check (char_length(whatsapp)  <= 20),
    add constraint profissionais_telefone_tamanho  check (char_length(telefone)  <= 20),
    add constraint profissionais_cidade_tamanho    check (char_length(cidade)    <= 80),
    add constraint profissionais_bairro_tamanho    check (char_length(bairro)    <= 80),
    add constraint profissionais_descricao_tamanho check (char_length(descricao) <= 500);

alter table public.contratacoes drop constraint if exists contratacoes_descricao_tamanho;
alter table public.contratacoes drop constraint if exists contratacoes_endereco_tamanho;
alter table public.contratacoes
    add constraint contratacoes_descricao_tamanho check (char_length(descricao) <= 1000),
    add constraint contratacoes_endereco_tamanho  check (char_length(endereco)  <= 200);

alter table public.avaliacoes drop constraint if exists avaliacoes_comentario_tamanho;
alter table public.avaliacoes
    add constraint avaliacoes_comentario_tamanho check (char_length(comentario) <= 500);


-- 5. Autoconferência -------------------------------------------------------------------
do $$
declare
    v_papel text;
begin
    foreach v_papel in array array['anon', 'authenticated'] loop
        if has_column_privilege(v_papel, 'public.usuarios', 'telefone', 'SELECT') then
            raise exception '014: % ainda lê usuarios.telefone', v_papel;
        end if;
        if not has_column_privilege(v_papel, 'public.usuarios', 'nome', 'SELECT') then
            raise exception '014: % perdeu a leitura de usuarios.nome (o diretório precisa)', v_papel;
        end if;
        if not has_function_privilege(v_papel, 'public.telefone_publico(uuid)', 'EXECUTE') then
            raise exception '014: % não executa telefone_publico (a view quebra)', v_papel;
        end if;
    end loop;

    if has_column_privilege('anon', 'public.usuarios', 'tipo_usuario', 'SELECT') then
        raise exception '014: visitante não precisa de usuarios.tipo_usuario';
    end if;
    if has_function_privilege('anon', 'public.meu_telefone()', 'EXECUTE')
       or not has_function_privilege('authenticated', 'public.meu_telefone()', 'EXECUTE') then
        raise exception '014: meu_telefone é só para quem está logado';
    end if;
    if not has_column_privilege('authenticated', 'public.usuarios', 'telefone', 'UPDATE') then
        raise exception '014: o dono precisa continuar editando o próprio telefone';
    end if;

    if (select count(*) from pg_constraint
         where contype = 'c'
           and conname in ('usuarios_nome_tamanho', 'usuarios_telefone_tamanho',
                           'profissionais_whatsapp_tamanho', 'profissionais_telefone_tamanho',
                           'profissionais_cidade_tamanho', 'profissionais_bairro_tamanho',
                           'profissionais_descricao_tamanho', 'contratacoes_descricao_tamanho',
                           'contratacoes_endereco_tamanho', 'avaliacoes_comentario_tamanho')) <> 10 then
        raise exception '014: faltam limites de tamanho';
    end if;

    if pg_get_viewdef('public.profissionais_publicos'::regclass) like '%u.telefone%' then
        raise exception '014: a view ainda lê usuarios.telefone direto';
    end if;
end;
$$;
