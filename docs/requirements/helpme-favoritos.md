# Requirements — Favoritar profissional (HU05)

**Status:** REQUIREMENTS_READY
**Discovery de origem:** `docs/discovery/helpme-favoritos.md` (PROBLEM_READY em 2026-11-27)
**Classificacao de Processo:** NORMAL PROCESS
**Numeração:** continua a de `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (último FR35, BR29, NFR15, A12), para as stories citarem IDs únicos no projeto.

## Intent Summary
O cliente marca profissionais como favoritos e volta a eles por uma lista própria, sem refazer a busca. Os favoritos continuam pessoais, e quem pode favoritar é decidido no banco.

## Functional Requirements
- **FR36** — No perfil de um profissional (`profissional.html`), o **cliente** logado vê um botão de favorito que mostra o estado atual ("Favoritar" / "Favoritado") e alterna com um toque.
- **FR37** — O visitante que toca no botão de favorito vai para o login e, depois de entrar como cliente, volta ao mesmo perfil.
- **FR38** — O cliente abre "Meus favoritos" pelo menu e vê os profissionais favoritados, do mais recente para o mais antigo: nome, categorias, bairro e cidade, e nota. Cada item leva ao perfil.
- **FR39** — O cliente remove um profissional de "Meus favoritos" direto da lista, sem abrir o perfil.

## Business / Domain Rules
- **BR30** — Só o **cliente** favorita, e só profissional **aprovado**. Profissional e admin não favoritam. Vale no banco, não só na tela.
- **BR31** — Favoritos são pessoais: cada cliente lê, cria e remove só os próprios. Ninguém mais (nem o profissional favoritado, nem o admin) lê quem favoritou quem pelo app.
- **BR32** — Um favorito por cliente e profissional (a chave da 001 já garante). Favoritar de novo não duplica; remover o que não existe não dá erro.
- **BR33** — Profissional que deixa de estar aprovado (pendente, recusado ou suspenso) não aparece em "Meus favoritos", mas o favorito não é apagado: ele volta se o profissional for reaprovado. O cliente pode remover esse favorito a qualquer momento.

## Non-Functional Requirements
- **NFR16** — Regras BR30 a BR32 no banco (RLS e permissões), com roteiro em `supabase/testes/` que se desfaz sozinho, como os da 003 à 019.
- **NFR17** — O botão de favorito anuncia o estado a leitores de tela (`aria-pressed`) e tem área de toque de 44px; ler o estado do favorito não atrasa o perfil (carrega depois, como as avaliações da US-026).
- **NFR18** — "Meus favoritos" lê os dados do profissional só pela view `profissionais_publicos` (nunca pela tabela `profissionais`).
- Valem para todas as telas: **NFR01** (RLS e anon key), **NFR03** (stack sem build), **NFR04** (360px), **NFR05** (acessibilidade) e texto do banco sempre por `textContent`.

## User Scenarios

### Main flow
1. O cliente abre o perfil de um profissional e toca "Favoritar". O botão passa a "Favoritado".
2. Mais tarde, abre "Meus favoritos" no menu e vê o profissional no topo da lista.
3. Toca no profissional e chega ao perfil, com o botão mostrando "Favoritado".
4. Toca de novo e o botão volta a "Favoritar"; o profissional sai da lista.

### Alternative / Error / Edge cases
- **Visitante** toca "Favoritar": vai ao login e volta ao perfil (FR37). Se entrar como profissional ou admin, o botão não aparece.
- **Profissional ou admin** no perfil de outro profissional: o botão não aparece; pela API, o banco recusa (BR30).
- **Profissional no próprio perfil:** o botão não aparece.
- **Duplo clique** no botão: o estado final é o do último toque, sem favorito duplicado nem erro (BR32).
- **Duas abas:** favoritou numa e desfavoritou na outra: o banco fica com a última ação; ao recarregar, a tela mostra o estado real.
- **Profissional suspenso depois de favoritado:** some da lista (BR33); o perfil dele não abre (já é assim hoje).
- **Lista vazia:** "Você ainda não tem favoritos. Toque em Favoritar no perfil de um profissional." com link para as categorias.
- **Falha de rede** ao favoritar ou remover: aviso, e o botão volta ao estado anterior.
- **Pela API:** favoritar profissional pendente ou a si mesmo, ler ou apagar favorito de outra pessoa, e visitante gravando: tudo recusado.

## Business / Domain Context
- HU05 do README ("quero favoritar profissionais, para facilitar o acesso a eles posteriormente") e regra do modelo "favoritos são pessoais".
- O "Relatório de profissionais favoritos" (item 4 dos relatórios do README) fica para depois (decisão do PO, D1).

## Technical Context & Constraints
- Próxima migration livre: `020_*`; aplicada pelo PO no SQL Editor.
- `favoritos` (001): chave (usuário, profissional), `created_at`, uma política `favoritos: tudo pelo dono` (`for all`). Ela é trocada por políticas separadas: ler e apagar os próprios; criar só cliente com profissional aprovado. Sem `update` (não há o que editar).
- Permissões por coluna (mesmo padrão da 018): o app só grava `usuario_id` e `profissional_id`; `created_at` vem do servidor. O visitante perde as permissões de escrita.
- O menu vem de `ITENS_MENU` em `js/telas/navegacao.js` (DEBT-009): o item "Meus favoritos" entra ali, só para o cliente.
- O perfil já decide o "Contratar" por quem está vendo (`prepararAcoesDoPerfil` em `perfil-profissional.js`): o botão de favorito segue a mesma regra de papel.

## Quality Attributes
- **Segurança e privacidade:** regras no banco; o profissional não descobre quem o favoritou.
- **Testabilidade:** roteiro SQL da 020; teste de tela com sessão e banco simulados.
- **Desempenho percebido:** o estado do favorito não segura o carregamento do perfil.

## Assumptions
- **A13** — Sem limite de quantidade de favoritos (lista sem paginação neste momento).
- **A14** — Favoritar não depende de contratação anterior.
- **A15** — Remover da lista não pede confirmação: é fácil favoritar de novo. A tela avisa "Removido dos favoritos".
- **A16** — Favoritos já gravados por quem não é cliente são apagados na migration (no banco real, em 2026-11-27, não há nenhum; o único favorito é de cliente para profissional aprovado).

## Out of Scope
- Profissional ver quem o favoritou; notificação; pastas ou listas nomeadas; coração nos cards da lista da categoria; ordenar ou filtrar favoritos; relatório de favoritos (todos no OUT/LATER do Discovery).

## Open Questions
- Nenhuma bloqueante.

## Key Decisions Proposed
- **Tela própria `meus-favoritos.html`** no menu do cliente, em vez de uma seção em "Meu perfil": mesmo padrão de "Minhas contratações" e mais fácil de achar.
- **Escrita direta na tabela** (insert/delete com RLS e permissões por coluna), sem função nova: não há regra de corrida nem histórico, como havia no orçamento.
- **Duas leituras na lista:** os ids dos favoritos do cliente e, depois, os perfis pela view `profissionais_publicos`. Quem não está aprovado simplesmente não volta (BR33).
- **Uma story só** (botão no perfil + lista + migration), por volta de 3 pontos.

## Review & Adjust

O usuario pode **aprovar, editar, adicionar, remover ou reclassificar** qualquer requisito/regra antes do gate.

- [x] Proposta completa apresentada ao usuario
- [x] Ajustes solicitados incorporados
- [x] IDs estabilizados depois da revisao
- [x] Nenhuma pergunta bloqueante aberta

### User adjustments
- 2026-11-27 (R1): PO aprovou os requisitos sem mudanças (FR36 a FR39, BR30 a BR33, NFR16 a NFR18, A13 a A16 e as decisões propostas).

## Gate G1 — REQUIREMENTS READY

**Status:** APPROVED (2026-11-27)

**Aprovado pelo usuario:** sim
