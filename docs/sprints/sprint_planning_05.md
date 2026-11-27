# Sprint Planning - Sprint 05

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO), Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (a confirmar)
**Sprint Duration:** 1 semana (2026-12-01 a 2026-12-08) — Marco 3
**Sprint Goal:** O cliente aprova o preço do serviço dentro do app antes de concluir, e só quem teve o serviço concluído avalia o profissional.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

**Status do planejamento:** RASCUNHO — aguardando o Review & Adjust do PO (escopo, datas e responsáveis).

---

## Sprint Capacity

- **Velocity anterior:** Sprint 04 — 27 pts implementados (16 planejados), em Done só depois da banca de 26/11. Sprint 03 — 15 implementados, 0 em Done dentro da sprint (`docs/retrospectives/sprint_03_retro.md`).
- **Capacidade estimada:** 16 pontos (mesma das Sprints 02 a 04). Meta da retrospectiva da Sprint 03: **≥ 70% dos pontos em Done até o último dia**.
- **Pontos planejados:** 15 (US-022 5 + US-023 3 + US-025 3 + US-026 3 + DEBT-012 1)
- **Dias úteis disponíveis:** 6 (01, 02, 03, 04, 07 e 08/12)
- **Impedimentos conhecidos:** DDL e escrita no banco só pelo PO (SQL Editor); senha das contas de teste fora do repositório (testes logados dependem dela).

---

## Sprint Goal

> O cliente aprova o preço do serviço dentro do app antes de concluir, e só quem teve o serviço concluído avalia o profissional.

---

## Antes da sprint (até 30/11, não contam pontos)

| Item | Responsável | Prazo |
|------|-------------|-------|
| Fechar a Sprint 04: DEBT-001 (README) e DEBT-002 (revisão final), US-011 (Redirect URL + teste com e-mail real) | Luiz (DEBT-001), Lucas (DEBT-002), Bruno (US-011) | 30/11 |
| Retrospectiva da Sprint 04 | Bruno Alves (PO) | 30/11 |
| Mesclar na `main` a retrospectiva da Sprint 03, o DEBT-013 e este planejamento (action item: documento de sprint na `main` em até 1 dia útil) | Bruno Alves (PO) | 30/11 |

---

## User Stories Selecionadas

Ordem: US-022 → US-023 (cadeia do orçamento, 8 pts) e, em paralelo, US-025 → US-026 (avaliação, 6 pts). DEBT-012 entra junto com a US-023 (as duas mexem nas regras da contratação).

### [US-022] Enviar e responder orçamento da contratação

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-005)
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** A DEFINIR (dupla 1)
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não · **Exige Contract governado?** Não
- **BDD:** N/A (roteiro SQL + testes de tela)
- **Behavior change esperado:** YES
- **Dependência:** nenhuma
- **Critérios de Aceitação:** ver `docs/stories/US-022_enviar-e-responder-orcamento.md`. Resumo:
  - [ ] Profissional envia valor (R$ 1,00 a R$ 100.000,00, centavos inteiros) e observação na contratação `aceita`
  - [ ] Cliente aprova ou recusa uma vez só; depois da recusa, o profissional envia outro
  - [ ] Histórico visível às duas partes; um aguardando e um aprovado no máximo (BR24)
  - [ ] Migration `015` com RLS e roteiro SQL; critérios comuns (360px, 44px, acessibilidade, NFR01)

### [US-023] Concluir só com valor aprovado e cancelar antes de aprovar

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-005)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** A DEFINIR (dupla 1)
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não · **Exige Contract governado?** Não
- **BDD:** N/A
- **Behavior change esperado:** YES
- **Dependência:** US-022
- **Critérios de Aceitação:** ver `docs/stories/US-023_concluir-com-valor-aprovado-e-cancelar.md`. Resumo:
  - [ ] `aceita → concluida` só com orçamento aprovado (banco e tela)
  - [ ] Cliente cancela a `aceita` enquanto não aprovou o valor; profissional não cancela
  - [ ] Testes `.mjs` da contratação atualizados e passando (NFR14)

### [US-025] Avaliar o profissional depois do serviço

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-005)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** A DEFINIR (dupla 2)
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não · **Exige Contract governado?** Não
- **BDD:** N/A
- **Behavior change esperado:** YES
- **Dependência:** nenhuma
- **Critérios de Aceitação:** ver `docs/stories/US-025_avaliar-profissional.md`. Resumo:
  - [ ] Cliente com contratação `concluida` avalia (1–5 + comentário) e edita; não apaga
  - [ ] Banco recusa avaliação sem contratação concluída (fecha o item 5 da banca)
  - [ ] Avaliação do seed sem contratação apagada na migration

### [US-026] Avaliações no perfil público do profissional

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-005)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** A DEFINIR (dupla 2)
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não · **Exige Contract governado?** Não
- **BDD:** N/A
- **Behavior change esperado:** YES
- **Dependência:** faz sentido depois da US-025
- **Critérios de Aceitação:** ver `docs/stories/US-026_avaliacoes-no-perfil-publico.md`. Resumo:
  - [ ] `profissional.html` lista até 20 avaliações com nota, comentário, primeiro nome e data
  - [ ] Primeiro nome por função `security definer`; nenhum outro dado do cliente exposto (NFR15)

### [DEBT-012] Banco recusa descrição e endereço vazios na contratação

- **Story Points:** 1
- **Assignee:** A DEFINIR (dupla 1, junto da US-023)
- **Critério:** `check (char_length(btrim(...)) > 0)` em `contratacoes.descricao` e `endereco`, validado contra os dados reais antes; `contratacao_api.mjs` US7-09 passa.

---

## Fora desta sprint

| Item | Pts | Destino sugerido |
|------|-----|------------------|
| US-024 — Situação do orçamento em Minhas contratações | 2 | Sprint 06 (ou entra se sobrar capacidade depois da US-022) |
| Pagamento simulado e favoritos (EPIC-005) | - | Refinar antes da Sprint 06 |
| Itens 6 a 19 da banca (DEBT-010) e DEBT-007 | - | Sprint 06 ou dívida técnica dedicada |

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **Discovery / Requirements:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`, `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (G0 e G1 em 2026-11-27)
- **TODO técnico:** N/A
- **Specs / Contracts:** nenhum
- **BDD a criar/atualizar:** N/A (roteiros SQL)
- **Gates opcionais da sprint:** N/A; testes `supabase/testes/*.sql` e `*.mjs` (Node, senha em `HELPME_SENHA`)
- **Task Issues a criar/atualizar:** `docs/tasks/breakdown_US-022.md`, `breakdown_US-023.md`, `breakdown_US-025.md`, `breakdown_US-026.md` (via `/feature-development`)
- **Migrations novas:** a partir da `015`; número final na ordem de aplicação no Supabase real (regra da Sprint 03)

## Definition of Done

- [ ] Critérios de aceitação atendidos e roteiro SQL com todas as linhas "ok" no banco real
- [ ] **Revisão independente no penúltimo dia útil (07/12)** — banca ou code review cruzado (action item da retrospectiva da Sprint 03)
- [ ] **PR aberto por quem foi nomeado para a story** (action item da retrospectiva da Sprint 03)
- [ ] Nível ScrumAIDev, Spec e Contract registrados na story
- [ ] Testes unitários — **dispensado** (sem runner); substituído por roteiro SQL e testes de tela
- [ ] Critérios comuns de mobile (360px) e acessibilidade verificados
- [ ] `supabase/README.md` atualizado quando o banco mudar
- [ ] Validação do Product Owner até 08/12

---

## Riscos e Dependências

| Risco/Dependência | Impacto | Mitigação |
|-------------------|---------|-----------|
| US-023 muda as regras de status da contratação e pode quebrar telas e testes da Sprint 02 | Alto | Rodar `contratacao_api.mjs` e `contratacao_telas.mjs` depois da migration (NFR14) |
| Quarta sprint seguida sem Done dentro da sprint | Alto | Revisão marcada para 07/12; nada de story nova depois de 04/12 |
| Cadeia US-022 → US-023 (8 pts) | Médio | US-022 no primeiro dia; dupla 2 segue a avaliação em paralelo |
| Trabalho concentrado em uma pessoa (Sprints 02 a 04: 1 autor de commits) | Alto | Cada dupla abre o PR da própria story; ninguém com mais da metade dos pontos |
| 1 contratação `aceita` sem orçamento no banco real | Baixo | Avisar as partes ou enviar o valor antes da migration da US-023 |
| Migrations aplicadas só pelo PO | Médio | Rodar cada migration no mesmo dia do PR |

---

## Notas e Decisões

- **2026-11-27:** rascunho gerado a partir do `/scope-idea` (NORMAL PROCESS) do orçamento e da avaliação: C0, G0 e G1 aprovados pelo PO; stories US-022 a US-026 aprovadas no Modo Backlog.
- **Primeiro vertical slice:** US-022 + US-023 (orçamento de ponta a ponta).

---

## Assistência IA Utilizada

- [x] Refinamento de user stories (Modo Backlog a partir do Requirements)
- [x] Estimativa de complexidade
- [x] Identificação de riscos técnicos
- [ ] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: capacidade e action items da retrospectiva da Sprint 03 aplicados à DoD
