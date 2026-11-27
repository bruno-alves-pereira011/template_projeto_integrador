-- =====================================================================
-- HelpMe — 017: o banco recusa descrição e endereço vazios na contratação (DEBT-012)
-- Achado US7-09 (contratacao_api.mjs): só o formulário barrava texto em branco;
-- pela API dava para criar uma contratação com descricao = '   ' e endereco = '   '.
--
-- O QUE FAZ: duas constraints novas em public.contratacoes.
--   contratacoes_descricao_preenchida   descricao tem ao menos 1 caractere que não é espaço
--   contratacoes_endereco_preenchido    endereco  idem
-- "Espaço" aqui é qualquer caractere em branco (espaço, tab, quebra de linha), como
-- o trim() do formulário (expressão regular '\S'). O máximo de tamanho continua o da 014.
-- Vale para todos, inclusive o painel: uma contratação sem descrição não faz sentido.
--
-- ANTES DE APLICAR: se já existir contratação em branco, a migration PARA e lista os ids.
-- Ela não apaga nada sozinha. Os testes antigos criavam uma (US7-09, descrição '   ',
-- sem a etiqueta [TESTE AUTO]); confira e apague, por exemplo:
--   delete from public.contratacoes where descricao !~ '\S' or endereco !~ '\S';
-- e rode esta migration de novo.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 016. Pode ser rodada de novo.
-- Depois, rode supabase/testes/017_contratacao_campos_obrigatorios.sql.
-- =====================================================================

do $$
declare
    v_ids text;
begin
    select string_agg(id::text, ', ' order by id) into v_ids
    from public.contratacoes
    where descricao !~ '\S' or endereco !~ '\S';

    if v_ids is not null then
        raise exception '017: há contratações com descrição ou endereço em branco (ids: %). Confira, apague ou corrija e rode de novo.', v_ids;
    end if;
end;
$$;


alter table public.contratacoes drop constraint if exists contratacoes_descricao_preenchida;
alter table public.contratacoes drop constraint if exists contratacoes_endereco_preenchido;
alter table public.contratacoes
    add constraint contratacoes_descricao_preenchida check (descricao ~ '\S'),
    add constraint contratacoes_endereco_preenchido  check (endereco  ~ '\S');

comment on constraint contratacoes_descricao_preenchida on public.contratacoes is
    'DEBT-012: descrição não pode ser vazia nem só espaços (o formulário também valida).';
comment on constraint contratacoes_endereco_preenchido on public.contratacoes is
    'DEBT-012: endereço não pode ser vazio nem só espaços (o formulário também valida).';


-- Autoconferência -------------------------------------------------------------------------------
do $$
begin
    if (select count(*) from pg_constraint
        where conrelid = 'public.contratacoes'::regclass and contype = 'c' and convalidated
          and conname in ('contratacoes_descricao_preenchida', 'contratacoes_endereco_preenchido')) <> 2 then
        raise exception '017: constraints de descrição/endereço ausentes ou não validadas';
    end if;
    if exists (select 1 from public.contratacoes where descricao !~ '\S' or endereco !~ '\S') then
        raise exception '017: ainda há contratação em branco';
    end if;
end;
$$;
