# Sprint Planning - Sprint 04

**Data:** 2026-11-09 (rascunho; confirmar no planning de 18/11, depois da retrospectiva da Sprint 03)
**Participantes:** Bruno Alves (PO), Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (a confirmar)
**Sprint Duration:** 1 semana (2026-11-18 a 2026-11-24)
**Sprint Goal:** O profissional entende por que está em análise ou foi recusado e consegue corrigir e reenviar; a triagem automática marca quem está pronto para aprovar; o README fecha a rastreabilidade do Marco 2.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

**Status do planejamento:** RASCUNHO — não comprometido. Revisar com a velocity real da Sprint 03 e passar pelo Review & Adjust do PO antes de começar.

---

## Sprint Capacity

- **Velocity anterior:** Sprint 03 — a preencher (planejados 16 pts)
- **Capacidade estimada:** ~11 pontos (16 pts em 6 dias → 4 dias úteis)
- **Pontos planejados neste rascunho:** 12
- **Dias úteis disponíveis:** 4 (18, 19, 23 e 24/11; 20/11 é feriado nacional da Consciência Negra)
- **Impedimentos conhecidos:** feriado de 20/11; a data de entrega do Marco 2 ainda não foi informada.

---

## Sprint Goal

> O profissional vê o motivo da pendência ou da recusa, corrige e reenvia; a triagem automática separa quem está "verde" e libera a aprovação em lote; o README do projeto e a revisão final por quem não escreveu o código fecham o Marco 2.

---

## Pré-condições (não contam pontos)

| Item | Responsável | Prazo |
|------|-------------|-------|
| US-014 e US-015 em Done (US-013 e US-016 dependem da US-015) | A DEFINIR | Fim da Sprint 03 (17/11) |
| Retrospectiva da Sprint 03 e velocity real | Bruno Alves (PO) | 18/11 |

---

## User Stories Selecionadas (rascunho)

Ordem de execução: US-016 → US-013 (US-013 usa as pendências da triagem); DEBT-001 e DEBT-002 no fim, sobre o que estiver pronto.

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

### [DEBT-001] README do projeto: rastreabilidade e "Como rodar"

- **Prioridade:** Alta (DoD do Marco 2)
- **Story Points:** 2
- **Assignee:** A DEFINIR
- **Nivel ScrumAIDev:** 0
- **Behavior change esperado:** NO
- **Critérios de Aceitação:**
  - [ ] Seção 9: rastreabilidade HU × tela × tabela, incluindo contratação, chat e admin
  - [ ] Contratação no minimundo e nas HUs
  - [ ] Seção "Como rodar o projeto", incluindo os testes em `supabase/testes/`

### [DEBT-002] Revisão final por quem não escreveu o código

- **Prioridade:** Alta (DoD do Marco 2)
- **Story Points:** 2
- **Assignee:** A DEFINIR (não pode ser autor do código revisado)
- **Nivel ScrumAIDev:** 0
- **Behavior change esperado:** NO
- **Critérios de Aceitação:**
  - [ ] Fluxos com os usuários do seed, do visitante ao admin
  - [ ] Tentativa de burlar o RLS (reaproveitar `contratacao_api.mjs` e os roteiros `.sql`)
  - [ ] Checklist de acessibilidade e mobile (reaproveitar `contratacao_telas.mjs` nas telas novas)

---

## Fora deste rascunho (decisão pendente do PO)

| Item | Pts | Opções |
|------|-----|--------|
| US-021 — Triagem: sinais de suspeita e reanálise de aprovados | 3 | Sprint 05 ou corte do Marco 2 |
| US-017 — Painel de indicadores do administrador | 5 | Sprint 05 ou corte do Marco 2 |
| US-018 — Gestão de categorias | 3 | Sprint 05 ou corte do Marco 2 |

Total fora: 11 pts. Com a capacidade atual, eles cabem numa **Sprint 05 (25/11 a 01/12)**, se a data do Marco 2 permitir. Se não permitir, a sugestão é cortar primeiro a US-021 (Could de fato: depende da US-016 e trata casos raros) e a US-017.

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **TODO técnico:** N/A
- **GitHub Sprint Container em uso:** -
- **Specs a criar/atualizar:** nenhuma
- **Contracts a criar/atualizar:** nenhum
- **BDD a criar/atualizar:** `docs/bdd/aprovacao_profissionais.feature` (US-013, US-016)
- **Gates opcionais da sprint:** N/A
- **Task Issues a criar/atualizar:** `docs/tasks/breakdown_US-013.md`, `breakdown_US-016.md` (via `/feature-development`)

## Definition of Done

Mesma da Sprint 03 (`docs/sprints/sprint_planning_03.md`), incluindo o roteiro com Gate Review e Gate Done escrito antes da implementação e o script de teste para cada regra nova de RLS/trigger.

---

## Riscos e Dependências

| Risco/Dependência | Impacto | Mitigação |
|-------------------|---------|-----------|
| Sprint curta (4 dias úteis) com cadeia US-016 → US-013 | Alto | US-016 no primeiro dia; se a US-015 não fechar na Sprint 03, a Sprint 04 inteira escorrega |
| US-015 não chegar a Done na Sprint 03 | Alto | Replanejar em 18/11; US-013 e US-016 só começam com a US-015 pronta |
| Regras de idade (18+) e telefone já existem no cadastro: risco de duplicar a lógica no banco | Médio | A triagem é a fonte de verdade no banco; o front só exibe |
| DEBT-002 exige revisor que não escreveu o código | Médio | Escolher o revisor no planning, entre quem não teve commits na sprint |
| Data de entrega do Marco 2 desconhecida | Alto | PO informar antes do planning de 18/11 para decidir Sprint 05 ou corte |

---

## Notas e Decisões

- **2026-11-09:** rascunho pedido pelo PO junto da aprovação da Sprint 03. Nada aqui está comprometido.
- A Sprint 04 do roadmap original (28 pts) não cabia. Este rascunho mantém a ordem de dependências e os itens de DoD do Marco 2.

---

## Assistência IA Utilizada

- [x] Refinamento de user stories (resumos)
- [x] Estimativa de complexidade (capacidade proporcional aos dias úteis)
- [x] Identificação de riscos técnicos
- [ ] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: sequenciamento das Sprints 04 e 05
