# Sprint Planning - Sprint 02

**Data:** 2026-10-16
**Participantes:** Bruno Alves, Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel
**Sprint Duration:** 1 semana (2026-10-16 a 2026-10-23)
**Sprint Goal:** Um cliente logado contrata um profissional aprovado pelo perfil, o profissional aceita ou recusa, e os dois acompanham a contratação até concluí-la, com os dados reais do Supabase.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

---

## Sprint Capacity

- **Velocity anterior:** Sprint 01 — 33 pts implementados, 0 em Done (`docs/retrospectives/sprint_01_retro.md`)
- **Capacidade estimada:** ~16 pontos (decisão da equipe na retrospectiva da Sprint 01)
- **Dias úteis disponíveis:** 6 (16, 19, 20, 21, 22 e 23/10)
- **Impedimentos conhecidos:** a `main` está quebrada até o merge do DEBT-004; aplicar SQL e criar usuários de teste depende de quem tem acesso ao painel do Supabase.

---

## Sprint Goal

> Entregar o núcleo do Fluxo 3: cliente contrata pelo perfil (com data/horário desejado) → profissional vê a solicitação e aceita ou recusa → os dois acompanham em tempo real e concluem, com o contato do cliente liberado só depois do aceite. O chat (US-010) fica para a Sprint 03.

---

## Pré-condições (action items da Sprint 01)

Não contam pontos, mas precisam acontecer antes da primeira story:

| Item | Responsável | Prazo |
|------|-------------|-------|
| Code review cruzado e merge do PR do DEBT-004 (`fix/sprint01-fechamento` → `main`) | Lucas dos Santos Felipe | 2026-10-20 |
| Testes manuais das US-001 a US-006 no Supabase real (recriar `prof1@helpme.test`) | Lucas dos Santos Felipe | 2026-10-20 |
| Decidir `refactor/ui-polish` (DEBT-005) antes da US-007 | Lucas dos Santos Felipe — a confirmar | 2026-10-20 |

---

## User Stories Selecionadas

Ordem de execução: DEBT-006 → US-007 → US-008 → US-009.

### [DEBT-006] Remover o legado de pedidos

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 1
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** NO (remove telas que não funcionam; nenhuma é alcançável pelo roteamento atual)
- **Critérios de Aceitação:**
  - [ ] `feed-profissional.html` e `js/profissional.js` removidos (pela D8, `solicitar-pedido.html`, `espera-cliente.html` e `servico-andamento.html` ficam e recebem a contratação)
  - [ ] Nenhum link ou script restante aponta para esses arquivos (busca no `helpme-app/`)
  - [ ] Console sem erros nas páginas que sobraram

### [US-007] Contratar profissional pelo perfil

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/contratacao.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-007_contratar-profissional-pelo-perfil.md`
  - [ ] Botão "Contratar" no perfil para visitante e cliente (não para profissional); visitante vai ao login e volta
  - [ ] Formulário com descrição, endereço e data/horário (não no passado)
  - [ ] Cria contratação `solicitada`; banco rejeita profissional contratando, profissional não aprovado e data no passado

### [US-008] Aceitar ou recusar solicitação recebida

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/contratacao.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-008_aceitar-ou-recusar-solicitacao.md`
  - [ ] `contratacoes.html` (profissional) lista as recebidas por status, com Realtime
  - [ ] Aceitar/recusar só em `solicitada`; cancelada antes do aceite mostra aviso
  - [ ] `DESTINO_PROFISSIONAL_APROVADO` em `js/sessao.js` passa a ser `contratacoes.html`

### [US-009] Acompanhar, cancelar e concluir contratação

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/contratacao.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-009_acompanhar-e-concluir-contratacao.md`
  - [ ] Cliente vê as próprias contratações em tempo real e cancela enquanto `solicitada`
  - [ ] `espera-cliente.html?id=` acompanha a contratação `solicitada` (tempo real, cancelar) e `servico-andamento.html?id=` mostra a `aceita`, com contato das partes só após o aceite (BR07) — D8
  - [ ] Qualquer parte conclui uma contratação `aceita`; terceiro vê "Contratação não encontrada"
  - [ ] Menu do cliente com "Minhas contratações"

**Total comprometido:** 16 pontos.

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **Requisitos:** `docs/requirements/helpme-mvp-marco2.md` (rev. 2: FR10–FR13, BR06, BR07, BR09, BR10)
- **TODO técnico:** N/A
- **GitHub Sprint Container em uso:** - (publicação no GitHub ainda não feita)
- **Specs a criar/atualizar:** N/A
- **Contracts a criar/atualizar:** N/A
- **BDD a criar/atualizar:** `docs/bdd/contratacao.feature` (conferir os cenários de BR06, BR07, BR09 e BR10 ao fechar cada story)
- **Gates opcionais da sprint:** N/A (sem runner de testes no projeto)
- **Task Issues a criar/atualizar:** N/A
- **Banco:** nenhuma migration nova prevista; `contratacoes`, triggers, `contato_contraparte` e Realtime já existem no `001` aplicado (D7: se surgir ajuste, vai num `003_*`, nunca no `001`)
- **Repositório/branch de código:** branches `feat/US-007-contratar`, `feat/US-008-solicitacoes-recebidas`, `feat/US-009-acompanhar-contratacao` e `chore/DEBT-006-remove-pedidos`, todas a partir de `main` depois do merge do DEBT-004

## Definition of Done

- [ ] Código revisado (code review por quem não escreveu — action item da retrospectiva)
- [ ] Decisão sobre Spec governada registrada para cada US
- [ ] Decisão sobre Contract governado registrada para cada US
- [ ] Nível ScrumAIDev registrado para cada US
- [ ] Specs, Contracts e BDD atualizados quando aplicável
- [ ] Testes unitários — **dispensado** (sem runner); substituído por testes manuais documentados na story
- [ ] Testes de integração, contract e BDD — **dispensados**; BDD com revisão manual
- [ ] **Testes manuais executados no Supabase real dentro da sprint** (lição da Sprint 01)
- [ ] Documentação atualizada (README do projeto quando o fluxo mudar)
- [ ] Build em CI/CD — **N/A** (sem build)
- [ ] Deploy em staging — **N/A**; validação via Live Preview contra o Supabase real
- [ ] Critérios comuns de mobile (360px) e acessibilidade básica verificados
- [ ] Validação do Product Owner

---

## Riscos e Dependências

| Risco/Dependência | Impacto | Mitigação |
|-------------------|---------|-----------|
| `main` quebrada até o merge do DEBT-004 | Alto | Pré-condição da sprint, prazo 20/10; nenhuma branch nova antes do merge |
| US-007 leva o cliente à tela de acompanhamento (`espera-cliente.html`, D8), que só fica pronta na US-009 | Médio | Até a US-009, redirecionar para `contratacoes.html` (ou criar a casca de `contratacao.html` na US-007) e registrar no PR |
| `contratacoes.html` é compartilhada: lista do profissional (US-008) e do cliente (US-009) | Médio | US-008 cria a página já separando a visão por `tipo_usuario`; US-009 só acrescenta a visão do cliente |
| Realtime com RLS ainda não validado no ambiente real | Médio | Testar com duas abas logo na US-008; se não chegar o evento, recarregar a lista |
| Conflito de CSS com `refactor/ui-polish` | Médio | Decidir o DEBT-005 antes da US-007 |
| Sem responsável nomeado por item (decisão do PO em 16/10) | Médio | Nomear no início da sprint; action item da retrospectiva pede que ninguém fique com mais da metade dos pontos |
| Acesso ao painel do Supabase em uma pessoa | Médio | Criar usuários de teste (cliente + 2 profissionais aprovados) no início da sprint |

---

## Notas e Decisões

- **2026-10-23 — D8:** as telas antigas `solicitar-pedido.html`, `espera-cliente.html` e `servico-andamento.html` ficam e recebem a contratação (US-007 e US-009); `feed-profissional.html` e `js/profissional.js` saem no DEBT-006. Branches empilhadas: DEBT-006 → US-007 → US-008 → US-009, com PRs para `developer` mesclados nessa ordem.
- Capacidade de ~16 pts decidida na retrospectiva; a US-010 (chat) vai para a Sprint 03, junto com o primeiro slice do EPIC-006 (US-014, US-015, US-013).
- Responsáveis por item: **a definir** (decisão do PO em 2026-10-16: "sem responsável por enquanto").
- Folga: os ~16 pts deixam espaço para fechar o Done da Sprint 01 (testes e merge), que não conta pontos; por isso a reserva de 20% não foi descontada em pontos.
- Publicação no GitHub (`/scrumaidev-publish-github-planning`) continua pendente de decisão da equipe.

---

## Assistência IA Utilizada

- [x] Refinamento de user stories
- [x] Estimativa de complexidade
- [x] Identificação de riscos técnicos
- [x] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: revisão geral do projeto e retrospectiva da Sprint 01

## Andamento (2026-10-23)

| Item | Branch | Status |
|------|--------|--------|
| DEBT-004 | `fix/sprint01-fechamento` (integrado na `developer`) | PR para `main` ainda sem merge |
| DEBT-006 | `chore/DEBT-006-remove-pedidos` | Review — remove só o feed antigo (D8) |
| US-007 | `feat/US-007-contratar` | Review — `solicitar-pedido.html` |
| US-008 | `feat/US-008-solicitacoes-recebidas` | Review — `contratacoes.html` (profissional) |
| US-009 | `feat/US-009-acompanhar-contratacao` | Review — `espera-cliente.html`, `servico-andamento.html`, visão do cliente em `contratacoes.html` |

- `developer` atualizada com `main`, o conserto (DEBT-004) e o planejamento (`docs/fluxo3-admin-planejamento`). Branches empilhadas; PRs para `developer` mesclados na ordem DEBT-006 → US-007 → US-008 → US-009.
- Validação feita pelo agente: harness com DOM e Supabase falsos (16 + 10 + 17 casos), `node --check`, colisão de globais, links e ids. **Falta para Done:** testes manuais no Supabase real (duas abas: cliente e profissional), 360px/acessibilidade, code review cruzado e validação do PO.

## Situação no fim da sprint (2026-10-23)

| Métrica | Valor |
|---------|-------|
| Pontos comprometidos | 16 |
| Pontos implementados (em Review) | 16 |
| Pontos em Done | 0 |
| Pré-condições da retrospectiva 01 cumpridas | 0 de 3 (DEBT-004 sem merge na `main`, testes manuais da Sprint 01 não registrados, DEBT-005 sem decisão) |

- **Bloqueio para Done:** nenhum item foi testado no Supabase real e nenhum PR foi aberto ou revisado. A meta da retrospectiva 01 (70% em Done, commits de 3+ integrantes) não foi atingida.
- **Decisão pendente do PO:** estender a Sprint 02 (mesmo escopo, foco em teste, revisão e merge) ou encerrar com `/sprint-retrospective` e levar a validação para a Sprint 03.
- **Lacuna nova para a US-010 (chat):** pela D8, o profissional não tem tela de detalhe enquanto a contratação está `solicitada` — registrado como ponto de esclarecimento na story.
