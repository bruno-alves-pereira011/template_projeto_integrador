# Project Manifest

**Framework:** ScrumAIDev
**Status do projeto:** ACTIVE_SPRINT
**Projeto atual:** HelpMe — diretório de prestadores de serviço (Projeto Integrador, Marco 2)
**Origem do contexto:** híbrido (código existente em `helpme-app/` + insumos em `arquivos/` + usuário)
**Confiança do contexto:** alta
**Contexto processado:** sim
**Estado operacional:** Sprint 02 no último dia (16/10 a 23/10/2026): DEBT-006 e US-007 a US-009 implementados em branches, em Review (sem teste no Supabase real); DEBT-004 sem merge na `main`; US-001 a US-006 da Sprint 01 ainda em Review
**Última atualização:** 2026-10-23

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

- Sprint ativa: **Sprint 02** (`docs/sprints/sprint_planning_02.md`), termina em 2026-10-23 — **decisão pendente do PO: estender ou encerrar** (16 pts implementados, 0 em Done). Sprint 01 encerrada (`docs/retrospectives/sprint_01_retro.md`)
- Backlog: **gerado** (`docs/product_backlog.md`): EPIC-001 a EPIC-004, EPIC-006 (admin) e EPIC-007 (conta do cliente) no Marco 2, com stories refinadas; EPIC-005 no Marco 3; DEBT-004 a DEBT-008 da revisão de 2026-10-16
- Discovery e requisitos: `docs/discovery/helpme-mvp-marco2.md` e `docs/requirements/helpme-mvp-marco2.md`, ambos aprovados na rev. 3 (área admin + aprovação de profissionais)
- Decisões do projeto: `docs/DECISOES.md` (D1–D8; D8 = nomes antigos das telas de contratação)
- Branches: integração na `developer` (já tem `main` + DEBT-004 + planejamento). Sprint 02 empilhada: `chore/DEBT-006-remove-pedidos` → `feat/US-007-contratar` → `feat/US-008-solicitacoes-recebidas` → `feat/US-009-acompanhar-contratacao` → `docs/status-sprint02`; PRs ainda não abertos
- Próximo passo sugerido: (1) abrir os PRs da Sprint 02 para `developer`, na ordem da pilha; (2) testes manuais no Supabase real (US-001 a US-009) e code review cruzado; (3) merge do DEBT-004 na `main` e decisão do DEBT-005; (4) PO decide estender ou encerrar a Sprint 02 → `/sprint-retrospective` → `/sprint-planning` da Sprint 03 (US-010 + US-014, US-015, US-013)

> Atualize apenas ao final de cada sprint ou mudança relevante. Evite atualizações desnecessárias.
