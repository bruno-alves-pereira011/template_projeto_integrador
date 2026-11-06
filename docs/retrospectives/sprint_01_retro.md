# Sprint Retrospective - Sprint 01

**Data:** 2026-10-16
**Sprint período:** 2026-10-09 - 2026-10-16
**Participantes:** Bruno Alves, Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (respostas consolidadas pelo PO)
**Facilitador:** Bruno Alves (PO), com assistência de IA (`/sprint-retrospective`)

---

## 📊 Sprint Metrics

Fonte: `docs/sprints/sprint_planning_01.md` (seções "Andamento") e histórico do git de 09/10 a 16/10.

| Métrica | Planejado | Realizado | Delta |
|---------|-----------|-----------|-------|
| **Story Points (implementados)** | 33 (30 de stories + 3 do DEBT-003) | 33 | 0 |
| **Story Points (Done)** | 33 | 0 | -33 |
| **Stories completadas (Done)** | 6 | 0 (6 em Review) | -6 |
| **Bugs encontrados** | - | 2 (triggers antigos de `auth.users` quebrando o cadastro; `data_nascimento` legível pela API) | - |
| **Velocity (Done)** | - | 0 | primeira sprint, sem histórico |

Outros dados: 21 commits, 20 de uma mesma pessoa; 2 PRs mesclados (#1 e #2); a `main` ficou quebrada até o PR do DEBT-004 (`completar-perfil.js` chama `minha_data_nascimento()`, que só existe na branch `fix/sprint01-fechamento`); sem CI.

---

## 😊 What Went Well?

- ✅ **O escopo ampliado coube:** o Fluxo 2 (US-004 a US-006, +12 pts) entrou no meio da sprint, a pedido do PO, sem atrasar o Fluxo 1.
- ✅ **Planejamento organizado:** Discovery, requisitos, stories, BDD e decisões (D1–D5) registrados e rastreáveis; a mudança para os caminhos padrão do ScrumAIDev foi feita sem perder histórico.

---

## 😞 What Didn't Go Well?

- ❌ **Trabalho concentrado:** 20 de 21 commits de uma pessoa; o resto da equipe teve pouca participação no código e no banco.

### Observações dos dados (não marcadas pela equipe como problema)

- Nenhuma story chegou a Done: os testes manuais no Supabase real não foram feitos dentro da sprint.
- O acesso ao painel do Supabase ficou com uma pessoa (risco já previsto no planejamento).
- Branches ficaram sem PR (`fix/sprint01-fechamento`, `refactor/ui-polish`), e a `main` ficou quebrada.

---

## 💡 What Can We Improve?

- 🔧 **Distribuir o trabalho:** cada story da Sprint 02 com um responsável nomeado, e quem escreveu não revisa (o code review cruzado já é critério da DoD).
- 🔧 **Fechar o Done da Sprint 01 antes de abrir telas novas:** testes manuais e merge do DEBT-004 no início da Sprint 02.
- 🔧 **Compromisso menor e realista:** capacidade da Sprint 02 em ~16 pts (decisão da equipe), em vez de repetir os 30 pts.

---

## 🎯 Action Items

| Ação | Responsável | Prazo | Status |
|------|-------------|-------|--------|
| Fazer os testes manuais das US-001 a US-006 no Supabase real (recriar `prof1@helpme.test`) e registrar o resultado em cada story; fazer o code review cruzado e o merge do PR do DEBT-004 | Lucas dos Santos Felipe | 2026-10-20 | [ ] |
| No planejamento da Sprint 02, nomear um responsável por item, sem que uma mesma pessoa fique com mais da metade dos pontos | Bruno Alves (PO) | 2026-10-16 (Sprint Planning 02) | [ ] |
| Decidir se a branch `refactor/ui-polish` é mesclada ou descartada (DEBT-005) antes de começar a US-007 | Lucas dos Santos Felipe (autor do commit `visual`) — a confirmar | 2026-10-20 | [ ] |

Métrica de sucesso para a Sprint 02: pelo menos 70% dos pontos comprometidos em Done (não só implementados), e commits de pelo menos 3 integrantes.

---

## 🤖 IA-Assisted Development Insights

### What worked well with IA?
- Implementação rápida do escopo inteiro, com SQL de RLS comentado para a equipe explicar na apresentação.
- Revisão do código pegou a exposição da `data_nascimento` antes da entrega.

### Where IA could be improved?
- A IA não acessa o painel do Supabase: a validação no ambiente real depende da equipe e virou o gargalo para chegar a Done.
- Trabalho feito com agente por uma só pessoa concentra o conhecimento; o restante da equipe precisa revisar e testar para conseguir explicar o código.

### New IA techniques to try?
- Usar o agente para gerar o roteiro de testes manuais de cada story antes da implementação, para que outra pessoa da equipe execute.
- Roteiros SQL de teste de RLS versionados em `supabase/testes/` (NFR11, Requirements rev. 3).

---

## 📈 Team Health Check

**Escala: 1 (😞) a 5 (😊)**

| Dimensão | Rating | Comentários |
|----------|--------|-------------|
| **Colaboração** | não avaliado | Trabalho concentrado foi o ponto negativo marcado pela equipe |
| **Autonomia** | não avaliado | - |
| **Clareza de requisitos** | não avaliado | Planejamento organizado foi marcado como positivo |
| **Ferramentas/Infraestrutura** | não avaliado | - |
| **Work-life balance** | não avaliado | - |

---

## 🎓 Learnings & Knowledge Share

- **Técnicas aprendidas:** RLS com `security definer` e `search_path` fixo; privilégio de SELECT por coluna para esconder dado pessoal; triggers como máquina de estados.
- **Documentação criada:** `docs/discovery/helpme-mvp-marco2.md`, `docs/requirements/helpme-mvp-marco2.md`, `docs/stories/US-001` a `US-010`, `docs/bdd/contratacao.feature`, `supabase/README.md`.
- **Pair programming insights:** não houve pareamento nesta sprint.

---

## 📝 Notes & Additional Comments

- Na mesma data foi feita a revisão geral do projeto para o Fluxo 3: Discovery e Requirements rev. 3 aprovados (área admin e aprovação de profissionais, D6), D7 (só migrations incrementais) e stories US-011 a US-018 e US-021 criadas.
- Capacidade decidida para a Sprint 02: ~16 pts (DEBT-006 + US-007 a US-009).

---

## 🔄 Continuação para Próxima Sprint

### Keep Doing
- Registrar decisões e manter a rastreabilidade requisito → story → BDD.
- Incluir escopo novo só depois de passar pelo processo (Discovery/Requirements quando for NORMAL/HEAVY).

### Stop Doing
- Deixar branches sem PR e a `main` divergente por vários dias.
- Considerar uma story pronta só porque foi implementada.

### Start Doing
- Um responsável nomeado por item da sprint e revisão cruzada obrigatória.
- Testes manuais no Supabase real dentro da própria sprint, logo depois de cada merge.
