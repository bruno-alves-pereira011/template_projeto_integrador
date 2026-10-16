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
-- QUANDO RODAR: no SQL Editor, sempre que o banco tiver sido criado (ou
-- recriado) com um 001_schema.sql SEM esta correção. Atenção: rodar o 001
-- antigo de novo desfaz esta correção — rode este arquivo logo depois.
-- NÃO apaga dados e pode ser rodado quantas vezes quiser.
-- No final ele se confere sozinho: se algo ficou errado, dá ERRO.
-- =====================================================================

-- 1. Tabela: tira o SELECT geral e libera só as colunas públicas.
revoke select on public.profissionais from anon, authenticated;
grant select (id, whatsapp, telefone, cidade, bairro, descricao, status_aprovacao, created_at)
    on public.profissionais to anon, authenticated;

-- 2. Função para o dono ler a própria data.
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

-- 3. Conferência automática.
do $$
declare
    v_papel text;
begin
    foreach v_papel in array array['anon', 'authenticated'] loop
        if has_column_privilege(v_papel, 'public.profissionais', 'data_nascimento', 'select') then
            raise exception '002 FALHOU: % ainda lê data_nascimento', v_papel;
        end if;
        if not has_column_privilege(v_papel, 'public.profissionais', 'status_aprovacao', 'select') then
            raise exception '002 FALHOU: % perdeu a leitura das colunas públicas', v_papel;
        end if;
    end loop;

    if has_function_privilege('anon', 'public.minha_data_nascimento()', 'execute') then
        raise exception '002 FALHOU: visitante (anon) consegue executar minha_data_nascimento()';
    end if;
    if not has_function_privilege('authenticated', 'public.minha_data_nascimento()', 'execute') then
        raise exception '002 FALHOU: usuário logado não consegue executar minha_data_nascimento()';
    end if;

end;
$$;

-- Se chegou aqui, deu tudo certo (o SQL Editor mostra esta linha como resultado).
select '002 OK: data_nascimento protegida; colunas públicas e minha_data_nascimento() funcionando.' as resultado;
