-- =====================================================================
-- HelpMe — 013: gestão de categorias pelo administrador (US-018)
-- Requisitos: FR22, BR20, BR11, NFR01. Decisões D6 e D7.
--
-- O QUE FAZ:
--   1. Regras de formato em categorias (as mesmas que a tela confere):
--        slug   minúsculas, números e hífen ("ar-condicionado"), único (já era);
--        nome   2 a 40 caracteres;
--        sigla  1 a 3 letras maiúsculas ou números ("EN");
--        cor    #RRGGBB;
--        descricao até 200 caracteres (opcional).
--   2. O admin cria e edita (políticas com eh_admin()). Privilégio só nas
--      colunas editáveis: ninguém escolhe o id.
--   3. NINGUÉM apaga pelo app (BR20): o "on delete cascade" de
--      profissional_categoria levaria junto os vínculos dos profissionais.
--      Desativar = ativa false (coluna criada na 005).
--
-- Cliente e profissional continuam só lendo (política pública da 001). Uma
-- tentativa de escrita deles: INSERT dá erro de RLS; UPDATE não acha linha.
--
-- QUANDO RODAR: uma vez, no SQL Editor, depois da 005 (categorias.ativa).
-- Não apaga dados e pode ser rodado de novo. As categorias atuais já seguem
-- os formatos (conferido em 2026-11-26). No final ele se confere sozinho.
-- =====================================================================

do $$
begin
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'categorias' and column_name = 'ativa') then
        raise exception '013: aplique antes a 005_triagem.sql (categorias.ativa)';
    end if;
    if to_regprocedure('public.eh_admin()') is null then
        raise exception '013: aplique antes a 003_admin.sql (eh_admin)';
    end if;
end;
$$;


-- 1. Formatos ---------------------------------------------------------------------
alter table public.categorias drop constraint if exists categorias_slug_formato;
alter table public.categorias drop constraint if exists categorias_nome_tamanho;
alter table public.categorias drop constraint if exists categorias_sigla_formato;
alter table public.categorias drop constraint if exists categorias_cor_formato;
alter table public.categorias drop constraint if exists categorias_descricao_tamanho;

alter table public.categorias
    add constraint categorias_slug_formato
        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
    add constraint categorias_nome_tamanho
        check (char_length(trim(nome)) between 2 and 40),
    add constraint categorias_sigla_formato
        check (sigla ~ '^[A-Z0-9]{1,3}$'),
    add constraint categorias_cor_formato
        check (cor ~ '^#[0-9A-Fa-f]{6}$'),
    add constraint categorias_descricao_tamanho
        check (descricao is null or char_length(descricao) <= 200);


-- 2. Privilégios: leitura para todos (001), escrita só nas colunas editáveis, sem DELETE
revoke insert, update, delete, truncate on public.categorias from anon, authenticated;
grant insert (slug, nome, descricao, sigla, cor, ativa) on public.categorias to authenticated;
grant update (slug, nome, descricao, sigla, cor, ativa) on public.categorias to authenticated;


-- 3. Políticas do admin --------------------------------------------------------------
drop policy if exists "categorias: admin cria" on public.categorias;
create policy "categorias: admin cria"
    on public.categorias for insert to authenticated
    with check ((select public.eh_admin()));

drop policy if exists "categorias: admin edita" on public.categorias;
create policy "categorias: admin edita"
    on public.categorias for update to authenticated
    using ((select public.eh_admin()))
    with check ((select public.eh_admin()));

comment on column public.categorias.ativa is
    'false = desativada pelo admin (BR20): some da home e do completar-perfil; vínculos mantidos. Nunca apagar pelo app (US-018).';


-- 4. Autoconferência -------------------------------------------------------------------
do $$
declare
    v_coluna text;
begin
    if has_table_privilege('authenticated', 'public.categorias', 'DELETE')
       or has_table_privilege('anon', 'public.categorias', 'DELETE')
       or has_table_privilege('anon', 'public.categorias', 'INSERT')
       or has_table_privilege('anon', 'public.categorias', 'UPDATE') then
        raise exception '013: o app não pode apagar categorias, e visitante não escreve';
    end if;

    if has_column_privilege('authenticated', 'public.categorias', 'id', 'INSERT')
       or has_column_privilege('authenticated', 'public.categorias', 'id', 'UPDATE') then
        raise exception '013: o id da categoria não pode ser escolhido pelo app';
    end if;

    foreach v_coluna in array array['slug', 'nome', 'descricao', 'sigla', 'cor', 'ativa'] loop
        if not has_column_privilege('authenticated', 'public.categorias', v_coluna, 'UPDATE') then
            raise exception '013: falta o privilégio de edição na coluna %', v_coluna;
        end if;
    end loop;

    if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'categorias'
          and policyname in ('categorias: admin cria', 'categorias: admin edita')) <> 2 then
        raise exception '013: políticas do admin não criadas';
    end if;

    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categorias'
                 and cmd = 'DELETE') then
        raise exception '013: categorias não pode ter política de DELETE (BR20)';
    end if;

    if (select count(*) from pg_constraint where conrelid = 'public.categorias'::regclass
          and conname in ('categorias_slug_formato', 'categorias_nome_tamanho', 'categorias_sigla_formato',
                          'categorias_cor_formato', 'categorias_descricao_tamanho')) <> 5 then
        raise exception '013: faltam regras de formato em categorias';
    end if;
end;
$$;
