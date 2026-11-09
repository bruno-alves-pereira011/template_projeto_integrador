# Sprint Planning - Sprint 04

**Data:** 2026-11-09 (rascunho; confirmar no planning de 23/11, depois da retrospectiva da Sprint 03)
**Participantes:** Bruno Alves (PO), Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (a confirmar)
**Sprint Duration:** 1 semana (2026-11-23 a 2026-11-30) — Marco 3
**Sprint Goal:** A triagem automática marca quem está pronto para aprovar, o profissional entende o motivo da pendência ou da recusa e reenvia, e o admin gerencia categorias e acompanha indicadores.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

**Status do planejamento:** RASCUNHO — não comprometido. Revisar com a velocity real da Sprint 03 e passar pelo Review & Adjust do PO antes de começar.

---

## Sprint Capacity

- **Velocity anterior:** Sprint 03 — a preencher (planejados 16 pts)
- **Capacidade estimada:** 16 pontos
- **Pontos planejados neste rascunho:** 16 (US-016 5 + US-013 3 + US-018 3 + US-017 5)
- **Dias úteis disponíveis:** 6 (23, 24, 25, 26, 27 e 30/11)
- **Impedimentos conhecidos:** nenhum conhecido; 20/11 (feriado) fica entre as Sprints 03 e 04.

---

## Sprint Goal

> A triagem automática separa quem está "verde" e libera a aprovação em lote; o profissional vê o motivo da pendência ou da recusa, corrige e reenvia; o admin gerencia categorias e vê os indicadores.

---

## Pré-condições (não contam pontos)

| Item | Responsável | Prazo |
|------|-------------|-------|
| US-014 e US-015 em Done (US-013 e US-016 dependem da US-015; US-017 e US-018 da US-014) | Lucas, Davi e Luiz | Fim da Sprint 03 (19/11) |
| Retrospectiva da Sprint 03 e velocity real | Bruno Alves (PO) | 23/11 |

---

## User Stories Selecionadas (rascunho)

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
| US-021 — Triagem: sinais de suspeita e reanálise de aprovados | 3 | Sprint 05 (depende da US-016) |
| Revisão final do Marco 3 (nos moldes do DEBT-002) | - | Última sprint do Marco 3 |

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **TODO técnico:** N/A
- **GitHub Sprint Container em uso:** -
- **Specs a criar/atualizar:** nenhuma
- **Contracts a criar/atualizar:** nenhum
- **BDD a criar/atualizar:** `docs/bdd/aprovacao_profissionais.feature` (US-013, US-016)
- **Gates opcionais da sprint:** N/A
- **Task Issues a criar/atualizar:** `docs/tasks/breakdown_US-013.md`, `breakdown_US-016.md`, `breakdown_US-017.md`, `breakdown_US-018.md` (via `/feature-development`)

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

---

## Assistência IA Utilizada

- [x] Refinamento de user stories (resumos)
- [x] Estimativa de complexidade (capacidade proporcional aos dias úteis)
- [x] Identificação de riscos técnicos
- [ ] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: sequenciamento das Sprints 04 e 05
