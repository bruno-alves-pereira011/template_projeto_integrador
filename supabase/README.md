# Banco de dados do HelpMe (Supabase)

| Arquivo | Para que serve |
|---|---|
| `migrations/001_schema.sql` | Cria tabelas, triggers, view, função de contato, políticas RLS, Realtime e as 6 categorias. **Apaga e recria** as tabelas do schema `public` (inclusive a antiga `pedidos`, se existir). |
| `seed.sql` | Dados de teste: 1 cliente, 3 profissionais (2 aprovados, 1 pendente), avaliações, 1 favorito, 1 contratação `solicitada` (cliente → prof1, daqui a 2 dias) e 2 mensagens. |

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
(inclusive contratações, mensagens e avaliações reais) — depois rode o seed outra vez.

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

## O que o front precisa saber

**Cadastro**

```js
await supabaseClient.auth.signUp({
  email, password,
  options: { data: { nome, tipo_usuario: 'cliente' /* ou 'profissional' */, telefone } }
});
```

- O trigger `on_auth_user_created` cria a linha em `usuarios` com `nome` e `tipo_usuario` (inválido/ausente → `'cliente'`).
- Profissional, **já logado**, insere o próprio perfil em `profissionais` (`id = auth.uid()`, `data_nascimento`
  obrigatória, 18+) e as linhas em `profissional_categoria`.

**Diretório** — view `profissionais_publicos` (só aprovados, leitura sem login). Colunas: `id`, `nome`, `whatsapp`,
`telefone`, `cidade`, `bairro`, `descricao`, `created_at`, `categorias` (array de slugs), `media_notas`,
`total_avaliacoes`. Filtro por categoria: `.contains('categorias', ['encanador'])`.

**Contratação (decisão D5)** — tabela `contratacoes`:

| Ação | Quem | Como |
|---|---|---|
| Contratar | cliente logado, para profissional aprovado | `insert({ cliente_id: uid, profissional_id, descricao, endereco, data_desejada })` — status nasce `solicitada`; data no passado é recusada |
| Aceitar / recusar | o profissional contratado | `update({ status: 'aceita' })` / `'recusada'` com `.eq('id', id).eq('status', 'solicitada')` |
| Cancelar | o cliente | `update({ status: 'cancelada' })` com `.eq('status', 'solicitada')` |
| Concluir | qualquer das partes | `update({ status: 'concluida' })` com `.eq('status', 'aceita')` |

- Use o filtro `.eq('status', ...)` + `.select()`: se outra pessoa mudou o status antes, o update volta **0 linhas**
  (sem erro) e a tela deve avisar e recarregar. Sem o filtro, o banco devolve erro "Transição de status inválida".
- Só o `status` pode mudar; `updated_at` é preenchido pelo banco.
- **Contato da outra parte:** `supabaseClient.rpc('contato_contraparte', { p_contratacao_id: id })` → no máximo 1 linha
  `{ nome, telefone, whatsapp, contato_liberado }`. Para o cliente, sempre vem o contato do profissional. Para o
  profissional, antes do aceite vem só o primeiro nome do cliente (`telefone` nulo, `contato_liberado = false`); com
  status `aceita` ou `concluida` vem nome completo e telefone. Quem não é parte recebe lista vazia.
  O profissional **não** consegue ler a linha do cliente em `usuarios` diretamente.

**Chat** — tabela `mensagens` (`contratacao_id`, `autor_id`, `conteudo`, `created_at`):

- Ler: `.from('mensagens').select('*').eq('contratacao_id', id).order('created_at')`.
- Enviar: `insert({ contratacao_id, autor_id: uid, conteudo })` — 1 a 1000 caracteres (sem contar espaços nas pontas),
  só enquanto a contratação está `solicitada` ou `aceita`. Depois disso o histórico continua legível, mas não aceita
  mensagens novas. Mensagem não é editada nem apagada.
- Exibir sempre com `textContent` (NFR07).

**Realtime** — `contratacoes` e `mensagens` estão na publicação `supabase_realtime`. Cada usuário só recebe eventos
das linhas que o RLS deixa ele ler. Exemplo de chat:

```js
supabaseClient.channel('chat-' + id)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `contratacao_id=eq.${id}` },
      (payload) => adicionarMensagem(payload.new))
  .subscribe();
```

## Roteiro de verificação

### 1. Estrutura (SQL Editor)

```sql
-- 8 tabelas com RLS ligado (rowsecurity = true em todas)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- Políticas criadas
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 2;

-- Triggers
select event_object_schema, event_object_table, trigger_name
from information_schema.triggers
where trigger_name in ('on_auth_user_created', 'usuarios_proteger', 'profissionais_validar',
                       'contratacoes_validar', 'mensagens_validar');

-- Realtime: devem aparecer contratacoes e mensagens (e NÃO pedidos)
select tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- Categorias, diretório e dados do seed
select slug, sigla, cor from public.categorias order by id;
select nome, categorias, media_notas, total_avaliacoes from public.profissionais_publicos;
select id, status, data_desejada from public.contratacoes;
select contratacao_id, conteudo from public.mensagens order by created_at;
```

### 2. Testes manuais de RLS (SQL Editor)

Cada bloco simula um usuário: `set_config` coloca o "token" e `set local role` troca o papel. Rode cada bloco
**inteiro** (selecione tudo e Run). O `rollback` no fim desfaz qualquer alteração, então pode repetir à vontade.

```sql
-- 2.1 Visitante (anon): vê os 2 profissionais aprovados e NENHUMA contratação/mensagem
begin;
set local role anon;
select count(*) from public.profissionais;   -- esperado: 2
select count(*) from public.contratacoes;    -- esperado: 0
select count(*) from public.mensagens;       -- esperado: 0
rollback;
```

```sql
-- 2.2 prof1 ANTES de aceitar: vê a contratação, mas só o primeiro nome do cliente
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'prof1@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
select id, status from public.contratacoes;                            -- 1 linha, 'solicitada'
select * from public.contato_contraparte((select max(id) from public.contratacoes));
                                                                       -- nome = 'Ana', telefone = null, contato_liberado = false
select count(*) from public.usuarios where tipo_usuario = 'cliente';  -- esperado: 0
rollback;
```

```sql
-- 2.3 prof1 aceita: depois disso vê nome completo e telefone do cliente
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'prof1@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.contratacoes set status = 'aceita'
where status = 'solicitada' returning id, status, updated_at;         -- 1 linha
select * from public.contato_contraparte((select max(id) from public.contratacoes));
                                                                       -- 'Ana Paula Rocha', telefone preenchido, true
update public.contratacoes set descricao = 'outra';                   -- ERRO: só o status pode mudar
rollback;
```

```sql
-- 2.4 Cliente: não pode aceitar; pode cancelar; não contrata pendente nem com data no passado
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'cliente@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.contratacoes set status = 'cancelada' where status = 'solicitada' returning status;  -- 'cancelada'
insert into public.mensagens (contratacao_id, autor_id, conteudo)
values ((select max(id) from public.contratacoes), auth.uid(), 'oi');  -- ERRO: contratação cancelada (BR08)
rollback;

begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'cliente@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
values (auth.uid(), (select id from auth.users where email = 'prof3@helpme.test'),
        'x', 'y', now() + interval '1 day');                          -- ERRO: prof3 está pendente (BR10)
rollback;

begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'cliente@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.contratacoes (cliente_id, profissional_id, descricao, endereco, data_desejada)
values (auth.uid(), (select id from auth.users where email = 'prof2@helpme.test'),
        'x', 'y', now() - interval '1 hour');                         -- ERRO: data no passado (BR09)
rollback;
```

```sql
-- 2.5 prof2 (terceiro): não vê a contratação nem o chat, e não consegue escrever nele
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'prof2@helpme.test'), 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) from public.contratacoes;                              -- esperado: 0
select count(*) from public.mensagens;                                 -- esperado: 0
select * from public.contato_contraparte((select max(id) from public.contratacoes));  -- 0 linhas
insert into public.mensagens (contratacao_id, autor_id, conteudo)
values ((select max(id) from public.contratacoes), auth.uid(), 'intruso');  -- ERRO (RLS)
rollback;
```

> Observação: dentro dos blocos, `(select max(id) from public.contratacoes)` também passa pelo RLS. No bloco 2.5
> ele retorna nulo (prof2 não vê nada), e o insert falha do mesmo jeito.

### 3. Outros casos que devem falhar (adapte os blocos acima)

| Ação | Resultado esperado |
|---|---|
| Profissional tenta contratar | violação de RLS (só cliente contrata) |
| Cliente insere contratação já `aceita` ou em nome de outro cliente | violação de RLS |
| Profissional cancela; cliente aceita/recusa | erro do trigger |
| `solicitada → concluida`, `aceita → cancelada`, reabrir `concluida`/`recusada` | erro "Transição de status inválida" |
| Profissional com status `recusado` tenta aceitar | erro "Somente profissional aprovado..." |
| Mensagem só com espaços ou com 1001+ caracteres | erro de CHECK |
| Enviar mensagem em nome da outra parte | violação de RLS |
| `update`/`delete` em `mensagens`; `delete` em `contratacoes` | 0 linhas afetadas (não há política) |
| Cliente muda o próprio `tipo_usuario` | erro do trigger |
| Profissional com menos de 18 anos | erro "18 anos ou mais" |

### 4. Pelo app

1. Abrir o perfil do prof1 sem login → "Contratar" leva ao login e volta ao perfil.
2. Logar como `cliente@helpme.test` e contratar o prof2 (data futura).
3. Em outra aba anônima, logar como `prof2@helpme.test`: a solicitação aparece sozinha (Realtime); aceitar.
4. A aba do cliente muda o status sozinha; o chat funciona nas duas abas; o contato completo do cliente aparece para o prof2.
5. Concluir → o chat fica somente leitura.
6. `prof3@helpme.test` deve cair em `bloqueio.html`.

## Limitações conhecidas

- `data_nascimento` dos profissionais aprovados é legível por quem consultar a tabela `profissionais` diretamente
  (RLS filtra linhas, não colunas). O front deve usar a view `profissionais_publicos`, que não expõe essa coluna.
- O cliente não tem WhatsApp próprio no modelo: `contato_contraparte` devolve `whatsapp = null` para o cliente; o
  front pode usar o `telefone` para os dois botões.
- A lista de contratações do profissional não traz o nome do cliente (ele não lê `usuarios` do cliente); para mostrar
  o primeiro nome na lista, chame `contato_contraparte` por contratação.
- A regra "data não pode estar no passado" vale para **qualquer** insert, inclusive pelo painel.
- Se a confirmação de e-mail estiver ligada no projeto, o `signUp` não devolve sessão e o insert em `profissionais`
  logo após o cadastro falha; o profissional precisa completar o perfil depois do primeiro login.
- Exclusão de conta pelo app não está prevista (só pelo painel).
