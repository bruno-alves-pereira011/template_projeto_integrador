# Sprint Retrospective - Sprint 02

> **RASCUNHO — precisa da equipe.** Metricas e observacoes vem do git, do banco e dos artefatos. As secoes marcadas com `[EQUIPE]` so podem ser preenchidas pelas pessoas, e as acoes abaixo sao propostas.

**Data:** a definir (rascunho de 2026-11-06)
**Sprint periodo:** 2026-10-16 - 2026-10-23
**Participantes:** a confirmar
**Facilitador:** Bruno Alves (PO), com assistencia de IA (`/sprint-retrospective`)

---

## 📊 Sprint Metrics

Fontes: `docs/sprints/sprint_planning_02.md`, historico do git e consultas de leitura no Supabase real em 2026-11-06.

| Metrica | Planejado | Realizado | Delta |
|---------|-----------|-----------|-------|
| **Story Points (implementados)** | 16 (15 de stories + 1 do DEBT-006) | 16 | 0 |
| **Story Points (Done)** | 16 | 0 no momento deste rascunho | -16 |
| **Stories completadas (Done)** | 3 | 0 (3 em Review) | -3 |
| **Bugs encontrados** | - | [EQUIPE] nenhum registrado nos artefatos | - |
| **Velocity (Done)** | - | 0 | Sprint 01 tambem fechou com 0 |

Atualizar esta tabela depois do Gate Done de `docs/tasks/testes_contratacao.md`.

Outros dados: 13 commits sem merge no periodo, todos de Bruno Alves; o codigo da sprint chegou a `main` em 2026-11-06, 14 dias depois do fim da sprint; sem CI; `refactor/ui-polish` continua fora da `main`.

---

## 😊 What Went Well?

Observacoes dos dados, a confirmar:

- ✅ **Todo o escopo foi implementado:** os 16 pontos ficaram prontos dentro da sprint, respeitando a capacidade reduzida decidida na retrospectiva anterior.
- ✅ **A `main` foi consertada:** o DEBT-004 entrou, e o DEBT-006 e as US-007 a US-009 estao na `main`.
- ✅ **O banco real funciona:** o chat da US-010 passou em 26 de 26 verificacoes de RLS, e a tabela `mensagens` existe com Realtime.

[EQUIPE] O que mais funcionou?

---

## 😞 What Didn't Go Well?

Observacoes dos dados, a confirmar:

- ❌ **Segunda sprint sem Done:** o gargalo foi o mesmo da Sprint 01, os testes no ambiente real.
- ❌ **Trabalho ainda concentrado:** a meta era commits de pelo menos 3 integrantes; o periodo teve 1.
- ❌ **Testes atrasados:** as US-001 a US-006 deviam ser testadas ate 2026-10-20 e so foram registradas como concluidas em 2026-11-06.
- ❌ **Processo pulado:** a US-010 comecou sem esta retrospectiva e sem o planejamento da Sprint 03.
- ❌ **Backlog com erro na `main`:** o commit `fbe32eb` levou status errados de US-002 e US-003, sem revisao do diff.

[EQUIPE] O que mais atrapalhou?

---

## 💡 What Can We Improve?

- 🔧 **Testar antes de chamar de pronto:** usar um roteiro com gates claros, como `docs/tasks/testes_contratacao.md`, escrito antes da implementacao.
- 🔧 **Automatizar o que der no banco:** cada regra de RLS nova ganha um script em `supabase/testes/`.
- 🔧 **Dividir o teste:** quem escreve nao testa, o que tambem distribui o conhecimento do codigo.

---

## 🎯 Action Items

Revisao da Sprint 01:

| Acao da Sprint 01 | Status | Observacao |
|---|---|---|
| Testes das US-001 a US-006 e merge do DEBT-004 | Concluida com atraso | Prazo era 2026-10-20 |
| Nomear responsavel por item da Sprint 02 | Nao feita | Decisao do PO em 2026-10-16: "sem responsavel por enquanto" |
| Decidir `refactor/ui-polish` (DEBT-005) | Nao feita | Branch parada desde 2026-10-16 |
| Meta: 70% dos pontos em Done | Nao atingida ate agora | 0 de 16 pontos neste rascunho |
| Meta: commits de 3 integrantes | Nao atingida | 1 integrante no periodo |

Propostas para a Sprint 03, a decidir pela equipe:

| Acao | Responsavel | Prazo | Metrica de sucesso | Status |
|------|-------------|-------|--------------------|--------|
| Executar o Gate Done de US-007 a US-010 em `docs/tasks/testes_contratacao.md` | [EQUIPE] alguem que nao escreveu o codigo | [EQUIPE] | Todas as linhas com resultado e data | [ ] |
| Nomear um responsavel por item da Sprint 03, com no maximo metade dos pontos por pessoa | Bruno Alves (PO) | Sprint Planning 03 | Nenhum item sem nome | [ ] |
| Decidir `refactor/ui-polish`: mesclar ou descartar | [EQUIPE] | [EQUIPE] | Branch mesclada ou apagada | [ ] |

Metrica de sucesso para a Sprint 03: pelo menos 70% dos pontos em Done dentro da sprint e commits de pelo menos 3 integrantes.

---

## 🤖 IA-Assisted Development Insights

### What worked well with IA?
- Com acesso ao Supabase, a IA conferiu o banco real e rodou testes de RLS que desfazem tudo ao final. Isso reduz o gargalo apontado na Sprint 01.
- Teste de tela no Chrome com Supabase falso cobriu 45 verificacoes antes do teste manual.

### Where IA could be improved?
- A IA ainda nao prova a entrega do Realtime entre duas sessoes reais; isso depende de pessoas.
- Um commit da IA levou edicoes manuais do backlog sem revisar o diff. Conferir `git diff --cached` antes de todo commit.

### New IA techniques to try?
- Gerar o roteiro com gates de `Review` e `Done` antes de implementar cada story.

---

## 📈 Team Health Check

**Escala: 1 (😞) a 5 (😊)**

| Dimensao | Rating | Comentarios |
|----------|--------|-------------|
| **Colaboracao** | [EQUIPE] | - |
| **Autonomia** | [EQUIPE] | - |
| **Clareza de requisitos** | [EQUIPE] | - |
| **Ferramentas/Infraestrutura** | [EQUIPE] | - |
| **Work-life balance** | [EQUIPE] | - |

---

## 🎓 Learnings & Knowledge Share

- **Tecnicas aprendidas:** Realtime por contratacao, atualizacao condicionada ao status, teste de RLS com troca de papel e rollback.
- **Documentacao criada:** `docs/tasks/breakdown_US-007.md` a `breakdown_US-010.md`, `docs/tasks/testes_contratacao.md`, `supabase/testes/us010_chat_rls.sql`, decisoes D8 e D9.
- **Pair programming insights:** [EQUIPE]

---

## 📝 Notes & Additional Comments

- A US-010 nao fazia parte da Sprint 02. Foi desenvolvida em 2026-11-06, antes do planejamento da Sprint 03, por decisao do PO.
- A sprint terminou em 2026-10-23; esta retrospectiva esta sendo feita depois da data.

---

## 🔄 Continuacao para Proxima Sprint

### Keep Doing
- Capacidade realista e registro de decisoes.

### Stop Doing
- Comecar story nova com as anteriores ainda em `Review`.
- Deixar a sprint terminar sem retrospectiva.

### Start Doing
- Gates de teste por story e execucao por quem nao escreveu o codigo.
- Revisar o diff antes de cada commit.
