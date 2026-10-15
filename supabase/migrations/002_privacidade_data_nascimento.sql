-- =====================================================================
-- HelpMe — 002: esconder a data de nascimento dos profissionais
--
-- PROBLEMA: a política "profissionais: aprovados sao publicos" libera a
-- LINHA inteira de quem é aprovado, e anon/authenticated tinham SELECT na
-- tabela toda. Resultado: qualquer visitante lia data_nascimento pela API
-- (/rest/v1/profissionais?select=data_nascimento), mesmo a view
-- profissionais_publicos não mostrando essa coluna.
--
-- CORREÇÃO: SELECT por coluna, sem data_nascimento. O dono lê a própria
-- data pela função minha_data_nascimento() (tela completar-perfil.html).
--
-- Para quem JÁ rodou o 001 antes desta correção: rode só este arquivo no
-- SQL Editor. NÃO apaga dados e pode ser rodado de novo. Quem rodar o 001
-- atualizado do zero não precisa dele (o 001 já contém a mesma coisa).
-- =====================================================================

revoke select on public.profissionais from anon, authenticated;
grant select (id, whatsapp, telefone, cidade, bairro, descricao, status_aprovacao, created_at)
    on public.profissionais to anon, authenticated;

-- security definer: lê a coluna bloqueada, mas só a linha de quem chama.
create or replace function public.minha_data_nascimento()
returns date
language sql
stable
security definer
set search_path = public
as $$
    select data_nascimento from public.profissionais where id = auth.uid();
$$;

revoke execute on function public.minha_data_nascimento() from public, anon;
grant  execute on function public.minha_data_nascimento() to authenticated;


-- Verificação (rode depois; o rollback desfaz tudo):
--
-- begin;
-- set local role anon;
-- select count(*) from public.profissionais;              -- 2 (com o seed)
-- select data_nascimento from public.profissionais;       -- ERRO: permission denied
-- select nome from public.profissionais_publicos;         -- continua funcionando
-- rollback;
