# Sprint Planning - Sprint 04

**Data:** 2026-11-09 (rascunho); execução registrada em 2026-11-27
**Participantes:** Bruno Alves (PO), Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (a confirmar)
**Sprint Duration:** 1 semana (2026-11-23 a 2026-11-30) — Marco 3
**Sprint Goal:** A triagem automática marca quem está pronto para aprovar, o profissional entende o motivo da pendência ou da recusa e reenvia, e o admin gerencia categorias e acompanha indicadores.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

**Status do planejamento:** EM EXECUÇÃO — o escopo real passou do rascunho (ver **Execução real**). A sprint termina em 30/11.

---

## Sprint Capacity

- **Velocity anterior:** Sprint 03 — a preencher (planejados 16 pts)
- **Capacidade estimada:** 16 pontos
- **Pontos planejados neste rascunho:** 16 (US-016 5 + US-013 3 + US-018 3 + US-017 5)
- **Pontos entregues (até 27/11):** 27 — as 4 do rascunho mais US-021 (3), US-019 (5) e US-020 (3)
- **Dias úteis disponíveis:** 6 (23, 24, 25, 26, 27 e 30/11)
- **Impedimentos conhecidos:** nenhum conhecido; 20/11 (feriado) fica entre as Sprints 03 e 04.

---

## Sprint Goal

> A triagem automática separa quem está "verde" e libera a aprovação em lote; o profissional vê o motivo da pendência ou da recusa, corrige e reenvia; o admin gerencia categorias e vê os indicadores.

---

## Pré-condições (não contam pontos)

| Item | Responsável | Prazo |
|------|-------------|-------|
| US-014 e US-015 em Done (US-013 e US-016 dependem da US-015; US-017 e US-018 da US-014) — **feito** (as duas em Done) | Lucas, Davi e Luiz | Fim da Sprint 03 (19/11) |
| Retrospectiva da Sprint 03 e velocity real — **pendente** (não existe `docs/retrospectives/sprint_03_retro.md`) | Bruno Alves (PO) | 23/11 |

---

## Execução real (atualizado em 2026-11-27)

| Story | Pts | Status | Banco | Testes |
|-------|-----|--------|-------|--------|
| US-016 — Triagem automática: checagens obrigatórias | 5 | Done | `005_triagem.sql` | `supabase/testes/005_triagem.sql` |
| US-017 — Painel de indicadores do administrador | 5 | Done | `006_painel.sql` | `supabase/testes/006_painel.sql` |
| US-019 — Suspender/reativar profissional aprovado (Could, adiantada do Marco 3) | 5 | Done | `007_suspensao.sql` | `supabase/testes/007_suspensao.sql` |
| US-020 — Consulta de contratações pelo admin (Could, adiantada do Marco 3) | 3 | Done | `008_contratacoes_admin.sql` | `supabase/testes/008_contratacoes_admin.sql` |
| US-013 — Motivo da pendência/recusa e reenvio | 3 | Done | `010_reenvio.sql`, `011_leitura_analises.sql` | roteiros 010 (16/16) e 011 (13/13) |
| US-021 — Sinais de suspeita e reanálise de aprovados (adiantada da Sprint 05) | 3 | Done | `012_suspeita.sql` | roteiro 012 (23/23) |
| US-018 — Gestão de categorias | 3 | Done | `013_categorias_admin.sql` | roteiro 013 (18/18) |

Breakdowns em `docs/tasks/breakdown_US-0NN.md`.

**Fora das stories, na mesma sprint:**

- **DEBT-009:** navegação por papel e separação do front em `js/servicos/` e `js/telas/`. A migration `009_admin_nao_contrata.sql` impede o admin de contratar.
- **Banca de revisão (2026-11-26):** reprovou a primeira versão. Os 4 itens mais graves viraram o **DEBT-010** (`014_privacidade_limites.sql`, roteiro 20/20, senhas trocadas). Os itens 5 a 19 seguem em aberto no backlog.
- **DEBT-011:** este arquivo, o da Sprint 03, a retrospectiva da Sprint 02 e os testes da contratação estavam numa branch nunca mesclada e foram recuperados para a `main`.
- **US-011** (Sprint 03) foi portada para a estrutura do DEBT-009 e segue em Review: falta a Redirect URL no Supabase e o teste com e-mail real.

**Ainda aberto para fechar o Marco 2:** DEBT-001 (README com rastreabilidade) e DEBT-002 (revisão final independente), retrospectivas das Sprints 03 e 04.

---

## User Stories Selecionadas (rascunho de 2026-11-09, mantido como histórico)

Ordem de execução: US-016 → US-013 (US-013 usa as pendências da triagem); em paralelo, US-018 e US-017 (só dependem da US-014).

### [US-016] Triagem automática: checagens obrigatórias

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** A DEFINIR
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Dependência:** US-015
- **Critérios de Aceitação:** ver `docs/stories/US-016_triagem-automatica-checagens.md`. Resumo:
  - [ ] `solicitar_analise()` (`security definer`) grava `verde`/`pendencia` e as checagens em `analises_profissional`
  - [ ] `completar-perfil.js` chama a função ao salvar (criação e edição)
  - [ ] Checagens da BR13 (e-mail, 18+, cidade/bairro, descrição 30+, categoria ativa, telefone com DDD) com motivo legível
  - [ ] A fila da US-015 mostra o resultado e libera a aprovação em lote dos verdes (fecha o teste de ponta a ponta do critério 4 da US-015)
  - [ ] O profissional não grava `verde` pelo console (roteiro em `supabase/testes/`)
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01
- **Observação:** a story cita `004_triagem.sql`; usar o próximo número livre de migration (regra da Sprint 03).

### [US-013] Motivo da pendência/recusa e reenvio para análise

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** A DEFINIR
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Dependência:** US-015 (motivo de recusa); US-016 (lista de pendências)
- **Critérios de Aceitação:** ver `docs/stories/US-013_motivo-e-reenvio-analise.md`. Resumo:
  - [ ] Recusado vê em `bloqueio.html` o motivo da última recusa (`textContent`)
  - [ ] Pendente vê "em análise" e, com triagem, as pendências que precisa corrigir; link "Corrigir meu perfil"
  - [ ] "Reenviar para análise" volta o status para `pendente` e registra o reenvio no histórico (BR17)
  - [ ] O profissional só lê as próprias análises, sem os campos internos do admin
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01

### [US-018] Gestão de categorias (criar, editar, desativar)

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** A DEFINIR
- **Nivel ScrumAIDev:** a confirmar na story
- **Exige Spec governada?** Não
- **Exige Contract governado?** Não
- **BDD:** -
- **Behavior change esperado:** YES
- **Dependência:** US-014
- **Critérios de Aceitação:** ver `docs/stories/US-018_gestao-categorias.md`

### [US-017] Painel de indicadores do administrador

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** A DEFINIR
- **Nivel ScrumAIDev:** a confirmar na story
- **Exige Spec governada?** Não
- **Exige Contract governado?** Não
- **BDD:** -
- **Behavior change esperado:** YES
- **Dependência:** US-014
- **Critérios de Aceitação:** ver `docs/stories/US-017_painel-indicadores-admin.md`
- **Observação:** é a primeira a sair se a Sprint 03 atrasar (não bloqueia nenhuma outra story).

---

## Fora deste rascunho

| Item | Pts | Destino sugerido |
|------|-----|------------------|
| US-021 — Triagem: sinais de suspeita e reanálise de aprovados | 3 | ~~Sprint 05~~ entrou nesta sprint (Done) |
| Revisão final do Marco 3 (nos moldes do DEBT-002) | - | Última sprint do Marco 3 |

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **TODO técnico:** N/A
- **GitHub Sprint Container em uso:** -
- **Specs a criar/atualizar:** nenhuma
- **Contracts a criar/atualizar:** nenhum
- **BDD a criar/atualizar:** `docs/bdd/aprovacao_profissionais.feature` (US-013, US-016, US-019, US-021)
- **Gates opcionais da sprint:** N/A
- **Task Issues a criar/atualizar:** `docs/tasks/breakdown_US-013.md`, `breakdown_US-016.md`, `breakdown_US-017.md`, `breakdown_US-018.md`, `breakdown_US-019.md`, `breakdown_US-020.md`, `breakdown_US-021.md` (via `/feature-development`)

## Definition of Done

Mesma da Sprint 03 (`docs/sprints/sprint_planning_03.md`), incluindo o roteiro com Gate Review e Gate Done escrito antes da implementação e o script de teste para cada regra nova de RLS/trigger.

---

## Riscos e Dependências

| Risco/Dependência | Impacto | Mitigação |
|-------------------|---------|-----------|
| Cadeia US-016 → US-013 dentro da sprint | Médio | US-016 no primeiro dia |
| US-015 não chegar a Done na Sprint 03 | Alto | Replanejar em 23/11; US-013 e US-016 só começam com a US-015 pronta; US-017 sai primeiro |
| Regras de idade (18+) e telefone já existem no cadastro: risco de duplicar a lógica no banco | Médio | A triagem é a fonte de verdade no banco; o front só exibe |
| Data de entrega do Marco 3 desconhecida | Médio | PO informar antes do planning de 23/11 |

---

## Notas e Decisões

- **2026-11-09:** rascunho pedido pelo PO junto da aprovação da Sprint 03. Nada aqui está comprometido.
- **2026-11-09 — Marco 2 em 11/11:** DEBT-001 e DEBT-002 saíram desta sprint e foram para o fechamento do Marco 2 (10 e 11/11). A sprint passou para 23/11 a 30/11 (6 dias úteis), o que abriu espaço para US-018 e US-017. US-021 fica para a Sprint 05.
- **2026-11-27:** execução registrada. O escopo cresceu de 16 para 27 pontos: US-021 adiantada da Sprint 05 e US-019/US-020 do Marco 3. Também entraram DEBT-009, DEBT-010 (banca de revisão de 26/11) e DEBT-011. As branches de feature foram mescladas e apagadas; resta só a `main`.

---

## Assistência IA Utilizada

- [x] Refinamento de user stories (resumos)
- [x] Estimativa de complexidade (capacidade proporcional aos dias úteis)
- [x] Identificação de riscos técnicos
- [ ] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: sequenciamento das Sprints 04 e 05
