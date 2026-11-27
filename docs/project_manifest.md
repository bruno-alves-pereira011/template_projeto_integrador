# Project Manifest

**Framework:** ScrumAIDev
**Status do projeto:** ACTIVE_SPRINT
**Projeto atual:** HelpMe — diretório de prestadores de serviço (Projeto Integrador, Marcos 2 e 3)
**Origem do contexto:** híbrido (código existente em `helpme-app/` + insumos em `arquivos/` + usuário)
**Confiança do contexto:** alta
**Contexto processado:** sim
**Estado operacional:** Sprint 04 ativa (23/11 a 30/11/2026). 20 das 21 stories em Done; só a US-011 em Review (falta a Redirect URL no Supabase e o teste com e-mail real). `main` é a única branch.
**Última atualização:** 2026-11-27

## GitHub Planning Defaults

- `default_team`: `project_team`
- `assignee_strategy`: `artifact_owner_then_github_actor_then_none`
- `team_metadata_strategy`: `project_field_then_label_then_none`
- `type_label_strategy`: `type:epic`, `type:user-story`, `type:task`
- `milestone_auto_management`: `opt_in_prefix`
- `auto_managed_milestone_prefix`: `Sprint:`
- `milestone_reopen_policy`: `auto_managed_only`

## Framework Maturity Defaults

- `agileaidev_level`: `1`
- `spec_bdd_governance`: `available`
- `contract_first`: `docs_only`
- `contract_validation`: `not_configured`
- `contract_test_runner`: `not_configured`
- `bdd_runner`: `manual_review`
- `mock_strategy`: `not_configured`
- `type_generation`: `not_configured`
- `ci_contract_gates`: `optional_noop`
- `frontend_stack`: `html-css-js-vanilla` (sem build, em `helpme-app/`)
- `backend_stack`: `none` (sem servidor próprio; regras no banco via RLS e triggers)
- `database_stack`: `supabase-postgres` (em `supabase/`)

## Agent Delegation Defaults

- `delegation_mode`: `principal_agent_with_sidecars`
- `explorer_policy`: `read_only_parallel_allowed`
- `worker_policy`: `exclusive_write_scope_only`
- `canonical_artifacts_policy`: `single_writer`
- `delegation_rollout_stage`: `pilot`
- `handoff_artifact`: `templates/context_summary.md`

## Leitura Inicial do Agente

| Arquivo | Ler quando |
|---|---|
| Este arquivo | Primeira leitura da sessão ou quando o contexto for incerto |
| `AGENTS.md` | Antes de qualquer ação |
| `docs/maturity_model.md` | Ao decidir quanto de Spec, Contract, BDD, mocks e CI ativar |
| `docs/sprints/sprint_planning_NN.md` | Quando existir sprint ativa |
| `docs/product_backlog.md` | Ao planejar, priorizar ou continuar desenvolvimento |

**Não leia `README.md` para operar.** Ele é voltado a humanos e onboarding.

## Estrutura Operacional

```text
.agents/rules/       → padrões de código (leia ao gerar código)
.agents/skills/      → personas (use quando o workflow pedir)
.agents/workflows/   → processos (ativados por /slash-command)
templates/           → referência para criação de artefatos
docs/                → artefatos gerados (consulte, não reescreva sem necessidade)
docs/maturity_model.md → niveis 0-4 de adocao progressiva
examples/figma/      → insumos de análise (priorizar no /sprint-planning)
```


## Regras de Interpretação
Este repositório é a base do **framework ScrumAIDev**, mas este manifesto descreve o estado do **projeto derivado** que será iniciado a partir do framework.
Se Status do projeto = **UNDEFINED**, o projeto derivado ainda não foi formalmente consolidado; isso é esperado enquanto o framework está sendo refinado ou antes do primeiro `/init-project` de um produto real.
Se "Contexto processado" = sim:
- NÃO reanalizar automaticamente os insumos em examples/figma/
- Utilizar o backlog como fonte principal
Se "Contexto processado" = não:
- Permitir análise dos insumos para geração inicial do backlog
- Nesse caso, o próximo passo recomendado é /sprint-planning.
Se "Contexto processado" = parcial:
- Permitir reanálise controlada para refinamento
O nome do projeto derivado pode ser inferido provisoriamente a partir dos insumos encontrados e consolidado depois.
Após o primeiro /sprint-planning de um projeto derivado, atualizar este manifesto com nome, origem, confiança e novo estado.

## Estado Atual do Projeto

- **Sprint ativa:** Sprint 04 (`docs/sprints/sprint_planning_04.md`), de 23/11 a 30/11/2026. Foram entregues 27 pontos contra 16 planejados: além do rascunho, entraram US-021, US-019 e US-020. A seção "Execução real" do arquivo registra o que foi feito.
- **Sprints anteriores:** Sprint 01 e Sprint 02 com retrospectiva (`docs/retrospectives/sprint_01_retro.md`, `sprint_02_retro.md`). Sprint 03 (`docs/sprints/sprint_planning_03.md`) **sem retrospectiva**.
- **Backlog** (`docs/product_backlog.md`):
  - Done: US-001 a US-010 e US-012 a US-021.
  - Review: **US-011** (esqueci minha senha). Faltam a URL de `redefinir-senha.html` nas Redirect URLs do Supabase (TASK-004) e os casos RS-04/05/07/08 com e-mail real.
  - Dívidas abertas: DEBT-001 (README com rastreabilidade, DoD do Marco 2), DEBT-002 (revisão final independente), DEBT-007 (fixar versão da CDN do supabase-js) e os itens 5 a 19 da banca do DEBT-010.
  - DEBT-003 a DEBT-006, DEBT-009, DEBT-010 (itens 1 a 4) e DEBT-011 em Done.
  - Marco 3: EPIC-005 (pós-contratação e avaliações) ainda não começou.
- **Banco (Supabase `btjjbtjxcbvswgezpwgc`):** migrations 001 a 014 aplicadas pelo PO no SQL Editor; roteiros de teste em `supabase/testes/`. DDL e escrita no banco são sempre do PO.
- **Segurança (DEBT-010):** telefone pessoal fechado (014), limites de tamanho no banco e senhas das contas de teste e do admin trocadas em 26/11, fora do repositório. Os testes automatizados (`supabase/testes/*.mjs`, Node) pedem a senha em `HELPME_SENHA`.
- **Repositório:** só a `main`, local e no GitHub; todas as branches de feature foram mescladas e apagadas em 27/11.
- **Discovery e requisitos:** `docs/discovery/helpme-mvp-marco2.md` e `docs/requirements/helpme-mvp-marco2.md` (rev. 3). Decisões em `docs/DECISOES.md`.
- **Próximo passo sugerido:**
  1. Fechar a US-011: Redirect URL e teste com e-mail real.
  2. DEBT-001 e DEBT-002, que fecham o DoD do Marco 2.
  3. `/sprint-retrospective` da Sprint 03 e, em 30/11, da Sprint 04.
  4. Depois, `/sprint-planning` do Marco 3 (EPIC-005 e itens 5 a 19 da banca).

> Atualize apenas ao final de cada sprint ou mudança relevante. Evite atualizações desnecessárias.
