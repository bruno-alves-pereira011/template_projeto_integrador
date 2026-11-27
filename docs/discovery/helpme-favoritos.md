# Discovery — Favoritar profissional (HU05)

**Status:** PROBLEM_READY
**Classificacao de Processo:** NORMAL PROCESS (aprovada pelo PO em 2026-11-27)
**Origem:** híbrido (HU05 do README + pedido do PO + código e banco atuais)
**Iniciativa:** EPIC-005 (parte), item "HU05 — Favoritar profissional" do backlog, que estava como Ideia.

## Intent
Dar ao cliente um jeito rápido de voltar a um profissional de quem gostou ou que quer contratar depois, sem refazer a busca por categoria (HU05: "quero favoritar profissionais, para facilitar o acesso a eles posteriormente").

## Problem
- Para voltar a um profissional, o cliente precisa lembrar a categoria e procurar de novo na lista, ou achar uma contratação antiga em "Minhas contratações".
- A tabela `favoritos` existe desde a 001, mas nenhuma tela usa. O único favorito no banco é o do seed.
- A regra atual do banco é larga: qualquer logado (cliente, profissional ou admin) favorita qualquer profissional, inclusive pendente, suspenso ou a si mesmo. Hoje isso não aparece porque não há tela.

## Users / Stakeholders relevantes
- **Cliente:** favorita, desfavorita e abre a lista "Meus favoritos".
- **Visitante:** vê o perfil público. Ao tentar favoritar, precisa entrar.
- **Profissional:** é favoritado. Hoje não sabe por quem, e o README diz que favoritos são pessoais.
- **Administrador:** não participa nesta iniciativa (o relatório de favoritos ficou para depois).
- **Avaliadores da disciplina:** HU05 e "Relatório de profissionais favoritos" (item 4 dos relatórios do README) entram na rastreabilidade HU × tela × tabela (DEBT-001).

## Current Situation
- Tabela `public.favoritos` (001): `usuario_id`, `profissional_id`, `created_at`, chave primária (usuário, profissional). Uma política, `favoritos: tudo pelo dono` (`for all to authenticated`, `usuario_id = auth.uid()`). Ninguém lê o favorito dos outros, mas não há checagem de papel nem de profissional aprovado.
- Banco real (lido em 2026-11-27): 1 favorito (cliente → profissional aprovado, do seed).
- Telas onde o cliente encontra profissionais: `home-cliente.html` (categorias), `profissionais.html` (lista da categoria) e `profissional.html` (perfil, com "Contratar" e agora as avaliações). Menu lateral montado por `js/telas/navegacao.js` (DEBT-009), com "Minhas contratações" e "Meu perfil" para o cliente.
- A view `profissionais_publicos` só devolve profissional aprovado.

## Desired Outcome
- O cliente marca e desmarca um profissional como favorito com um toque e encontra todos os favoritos numa lista própria, a partir do menu.
- Favoritos continuam pessoais. A regra de quem pode favoritar vale no banco, não só na tela.

## Success Criteria
- No perfil do profissional, o cliente logado vê "Favoritar" e o estado atual (favoritado ou não), e muda com um toque; o estado se mantém ao recarregar.
- "Meus favoritos" lista os profissionais favoritados (nome, categorias, local, nota) e leva ao perfil de cada um.
- Pela API, ninguém lê nem altera favoritos de outra pessoa, e quem não é cliente é recusado ao favoritar. Roteiro SQL confere.
- Critérios comuns do projeto: 360px, toque de 44px, acessibilidade (botão com estado anunciado, por exemplo `aria-pressed`), `textContent` para texto vindo do banco.

## Scope

### IN
- Botão de favoritar no perfil do profissional (`profissional.html`), com estado ligado/desligado.
- Tela ou seção "Meus favoritos", no menu do cliente, com cada favorito levando ao perfil.
- Desfavoritar pela lista e pelo perfil.
- **[DECIDIDO]** Só o **cliente** favorita (profissional e admin não).
- Migration que ajusta a regra de escrita de `favoritos` (só cliente, só profissional aprovado), com roteiro SQL.

### OUT
- Profissional vendo quem o favoritou (favoritos são pessoais).
- Notificação ao profissional quando é favoritado.
- Pastas, listas nomeadas ou notas pessoais nos favoritos.

### LATER
- Coração direto nos cards da lista da categoria (`profissionais.html`).
- Ordenar ou filtrar "Meus favoritos".
- **[DECIDIDO]** "Relatório de profissionais favoritos" (item 4 do README): fica para depois. Quando entrar, só número agregado por profissional no painel do admin, sem dizer quem favoritou.

## Constraints / Feasibility
- Front sem build (HTML/CSS/JS), Supabase com RLS; DDL e escrita no banco são aplicadas pelo PO no SQL Editor; migrations só incrementais (DEBT-008), próxima livre: `020_*`.
- A lista precisa dos dados públicos do profissional: ler pela view `profissionais_publicos` (só aprovados), nunca pela tabela `profissionais`.
- O menu vem de uma lista única em `navegacao.js` (DEBT-009): o item novo entra ali.
- O perfil já tem leituras em paralelo e as avaliações carregam depois (US-026). O estado do favorito também não deve segurar o carregamento da página.

## Assumptions
- [ASSUMPTION] Visitante que toca em "Favoritar" vai para o login e volta ao perfil, como já acontece com "Contratar".
- [ASSUMPTION] Profissional que deixa de estar aprovado (suspenso ou reanálise) some de "Meus favoritos", porque a view não o devolve. O favorito continua guardado e ele volta se for reaprovado.
- [ASSUMPTION] Sem limite de quantidade de favoritos.
- [ASSUMPTION] O favorito do seed (cliente → profissional aprovado) continua válido com a regra nova.
- [ASSUMPTION] Favoritar não depende de ter contratado antes (diferente da avaliação).

## Risks
- **Regra larga hoje:** qualquer logado favorita profissional pendente ou a si mesmo pela API. Mitigação: a migration fecha antes da tela existir.
- **Perfil mais pesado:** uma leitura a mais no perfil. Mitigação: carregar depois do perfil aparecer, sem segurar o "Contratar".
- **Concentração de trabalho** (retrospectivas das Sprints 03 e 04): a story precisa de uma dupla que commita.

## Open Questions
- [RESOLVIDA 2026-11-27] Quem favorita: só o cliente.
- [RESOLVIDA 2026-11-27] Relatório de favoritos (item 4 do README): LATER, e quando entrar, só número agregado.

## Review & Adjust

- [x] Usuario revisou a proposta completa
- [x] Alteracoes solicitadas foram incorporadas
- [x] Decisoes relevantes foram confirmadas
- [x] Nao existem perguntas bloqueantes abertas

### User adjustments
- 2026-11-27 (C0): NORMAL PROCESS aprovado.
- 2026-11-27 (D1): PO decidiu "só o cliente favorita" e "relatório de favoritos fica para depois"; aprovou o Discovery com as suposições como estão.

## Gate G0 — PROBLEM READY

**Status:** APPROVED (2026-11-27)

**Aprovado pelo usuario:** sim
