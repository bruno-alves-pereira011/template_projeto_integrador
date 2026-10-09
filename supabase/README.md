# Banco de dados do HelpMe (Supabase)

| Arquivo | Para que serve |
|---|---|
| `migrations/001_schema.sql` | Cria tabelas, triggers, view, políticas RLS, Realtime e as 6 categorias. **Apaga e recria** as tabelas do schema `public`. |
| `seed.sql` | Dados de teste: 1 cliente, 3 profissionais (2 aprovados, 1 pendente), avaliações, 1 favorito e 1 pedido aberto. |

## Como aplicar (ordem)

1. **SQL Editor → cole `migrations/001_schema.sql` → Run.**
2. **Authentication → Users → Add user → Create new user**, marcando **Auto Confirm User**, para cada e-mail:
   `cliente@helpme.test`, `prof1@helpme.test`, `prof2@helpme.test`, `prof3@helpme.test` (senha sugerida: `Helpme@123`).
3. **SQL Editor → cole `seed.sql` → Run.** A última consulta mostra os 4 usuários com tipo e status.

Por que essa ordem: a linha em `usuarios` é criada por um trigger no momento em que o login é criado no Auth. Se o
schema for rodado **depois** dos usuários, a tabela `usuarios` é recriada vazia. Para evitar esse problema, o final do
`001_schema.sql` recria (backfill) os perfis de todos os logins já existentes, e o `seed.sql` faz *upsert* — mas a
ordem recomendada continua sendo **schema → criar usuários → seed**.

Os dois scripts podem ser rodados de novo sem duplicar dados. Rodar o schema de novo apaga tudo do `public`
(inclusive pedidos e avaliações reais) — depois rode o seed outra vez.

## Aprovar um profissional (manual — decisão D2)

Pelo **Table Editor → `profissionais`**: altere `status_aprovacao` para `aprovado` (ou `recusado`). Ou no SQL Editor:

```sql
update public.profissionais
set status_aprovacao = 'aprovado'
where id = (select id from auth.users where email = 'prof3@helpme.test');
```

O próprio profissional **não** consegue fazer isso pelo app: o trigger `validar_profissional` força `'pendente'` no
cadastro e recusa qualquer mudança de status vinda dos papéis `anon`/`authenticated`. O painel roda como `postgres`,
que é liberado.

## Cadastro pelo app (o que o front precisa mandar)

```js
await supabaseClient.auth.signUp({
  email, password,
  options: { data: { nome, tipo_usuario: 'cliente' /* ou 'profissional' */, telefone } }
});
```

- O trigger `on_auth_user_created` cria a linha em `usuarios` com `nome` e `tipo_usuario` (inválido/ausente → `'cliente'`).
- Profissional, **já logado**, insere o próprio perfil em `profissionais` (`id = auth.uid()`, `data_nascimento`
  obrigatória, 18+) e as linhas em `profissional_categoria`.
- Diretório: use a view `profissionais_publicos` (nome, contato, `categorias` como array de slugs, `media_notas`,
  `total_avaliacoes`). Filtro por categoria: `.contains('categorias', ['encanador'])`.
- `pedidos` usa `categoria_id` (não mais o texto `categoria`). Para obter o slug: `.select('*, categorias(slug, nome)')`.

## Roteiro de verificação

### 1. Estrutura (SQL Editor)

```sql
-- 7 tabelas com RLS ligado (rowsecurity = true em todas)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- Políticas criadas
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 2;

-- Triggers
select event_object_schema, event_object_table, trigger_name
from information_schema.triggers
where trigger_name in ('on_auth_user_created','usuarios_proteger','profissionais_validar','pedidos_validar_transicao');

-- pedidos está no Realtime
select * from pg_publication_tables where pubname = 'supabase_realtime';

-- Categorias e diretório
select slug, sigla, cor from public.categorias order by id;
select nome, categorias, media_notas, total_avaliacoes from public.profissionais_publicos;
```

### 2. Testes de RLS simulando um usuário (SQL Editor)

Rode cada bloco inteiro. `set local` só vale dentro da transação, e o `rollback` desfaz tudo.

```sql
-- Como visitante (anon): só os 2 profissionais aprovados
begin;
set local role anon;
select count(*) from public.profissionais;      -- esperado: 2
rollback;

-- Como prof3 (pendente): tentar se aprovar deve dar ERRO
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email='prof3@helpme.test'), 'role','authenticated')::text, true);
set local role authenticated;
update public.profissionais set status_aprovacao = 'aprovado' where id = auth.uid();  -- ERRO esperado
rollback;

-- Como prof2 (eletricista): não vê o pedido de encanador do seed
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email='prof2@helpme.test'), 'role','authenticated')::text, true);
set local role authenticated;
select count(*) from public.pedidos;            -- esperado: 0
rollback;

-- Como prof1 (encanador): vê e aceita o pedido aberto
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email='prof1@helpme.test'), 'role','authenticated')::text, true);
set local role authenticated;
update public.pedidos set status = 'em_andamento', profissional_id = auth.uid()
where status = 'aberto' returning id, status;   -- 1 linha
update public.pedidos set descricao = 'outra'; -- ERRO: só status pode mudar
rollback;
```

### 3. Outros casos que devem falhar (adapte os blocos acima)

| Ação | Resultado esperado |
|---|---|
| Cliente muda o próprio `tipo_usuario` | erro do trigger |
| Inserir profissional com `data_nascimento` de menos de 18 anos | erro "18 anos ou mais" |
| Profissional cria pedido | violação de RLS |
| Cliente cancela pedido `em_andamento` / reabre pedido `concluido` | erro "Transição de status inválida" |
| Usuário avalia a si mesmo / avalia profissional pendente / nota 6 | erro de CHECK ou RLS |
| Usuário lê favoritos de outro | 0 linhas |

### 4. Pelo app

1. Logar como `cliente@helpme.test`, criar pedido de encanador.
2. Em outra aba anônima, logar como `prof1@helpme.test`: o pedido aparece no feed; aceitar.
3. A aba do cliente (espera-cliente) deve mudar sozinha via Realtime.
4. `prof3@helpme.test` deve cair em `bloqueio.html`.

## Limitações conhecidas

- `data_nascimento` dos profissionais aprovados é legível por qualquer um que consulte a tabela `profissionais`
  diretamente (RLS filtra linhas, não colunas). O front deve usar a view `profissionais_publicos`, que não expõe essa coluna.
- O nome do cliente **não** aparece no feed do profissional antes do aceite (o RLS de `usuarios` só libera as partes
  de um pedido já aceito). Depois do aceite, cliente e profissional leem nome/telefone um do outro.
- Se a confirmação de e-mail estiver ligada no projeto, o `signUp` não devolve sessão e o insert em `profissionais`
  logo após o cadastro falha; o profissional precisa completar o perfil depois do primeiro login.
- Exclusão de conta pelo app não está prevista (só pelo painel).
