# Product Backlog

**Produto:** HelpMe — Hub de Contatos de Emergencia para Servicos Residenciais
**Product Owner:** Equipe do Projeto Integrador (IFES Campus Serra)
**Ultima atualizacao:** 2026-10-09

---

## Visao do Produto

> O HelpMe permite que qualquer morador encontre rapidamente um profissional de servicos residenciais (encanador, eletricista, chaveiro, pedreiro, pintor, gesseiro), veja seu perfil, fale com ele por telefone/WhatsApp e o contrate diretamente pelo app, com chat e acompanhamento do servico.

Origem: `docs/discovery/helpme-mvp-marco2.md` (PROBLEM_READY) → `docs/requirements/helpme-mvp-marco2.md` (REQUIREMENTS_READY). Codigo em `template_projeto_integrador/`.

Use `Spec`, `Contract` e `BDD` para rastrear os artefatos tecnicos quando a User Story exigir governanca adicional. Quando nao se aplicar, use `-`.

---

## Backlog Items

### Alta Prioridade — Marco 2

#### [EPIC-001] Base funcional

**Objetivo:** App rodando contra o Supabase real, sem modo demo, com configuracao e categorias em fonte unica.
**Valor de negocio:** Alto
**Estimativa:** 5 pontos (+ DEBT-003)
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-001 | - | Ver categorias reais na home publica | 5 | Review | Sprint 01 | - | - | - |

#### [EPIC-002] Diretorio e contato (HU01–HU03)

**Objetivo:** Visitante encontra profissional aprovado por categoria e o contata por telefone/WhatsApp, sem login.
**Valor de negocio:** Alto
**Estimativa:** 10 pontos
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-002 | - | Listar profissionais aprovados por categoria | 5 | Review | Sprint 01 | - | - | - |
| US-003 | - | Ver perfil e contatar profissional | 5 | Review | Sprint 01 | - | - | - |

#### [EPIC-003] Conta e acesso

**Objetivo:** Cadastro, login com roteamento por tipo/status, perfil do profissional (18+, N categorias) e tela de analise.
**Valor de negocio:** Alto
**Estimativa:** 12 pontos
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-004 | - | Cadastro e login com roteamento por tipo | 5 | Review | Sprint 01 | - | - | - |
| US-005 | - | Completar e editar perfil do profissional | 5 | Review | Sprint 01 | - | - | - |
| US-006 | - | Tela de cadastro em analise | 2 | Review | Sprint 01 | - | - | - |

#### [EPIC-004] Contratacao no app

**Objetivo:** Cliente contrata profissional pelo perfil (com data/horario), profissional aceita/recusa, ambos acompanham, conversam por chat e concluem.
**Valor de negocio:** Alto
**Estimativa:** 20 pontos
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-007 | - | Contratar profissional pelo perfil | 5 | Backlog | - | - | - | docs/bdd/contratacao.feature |
| US-008 | - | Aceitar ou recusar solicitacao recebida | 5 | Backlog | - | - | - | docs/bdd/contratacao.feature |
| US-009 | - | Acompanhar, cancelar e concluir contratacao | 5 | Backlog | - | - | - | docs/bdd/contratacao.feature |
| US-010 | - | Chat em tempo real na contratacao | 5 | Backlog | - | - | - | docs/bdd/contratacao.feature |

---

### Media Prioridade — Marco 3 (LATER)

#### [EPIC-005] Pos-contratacao e engajamento

**Objetivo:** Orcamento, pagamento simulado, avaliacoes e favoritos.
**Valor de negocio:** Medio
**Estimativa:** a refinar
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| (a refinar) | - | Orcamento: profissional envia valor, cliente aprova | - | Ideia | - | - | - | - |
| (a refinar) | - | Pagamento simulado (forma + status pago, sem gateway) | - | Ideia | - | - | - | - |
| (a refinar) | - | HU04 — Avaliar profissional (1–5 + comentario) | - | Ideia | - | - | - | - |
| (a refinar) | - | HU05 — Favoritar profissional | - | Ideia | - | - | - | - |

---

## Technical Debt & Bugs

| ID | Descricao | Prioridade | Estimativa | Impacto |
|----|-----------|------------|------------|---------|
| DEBT-003 | **Sprint 01 — implementado (a701e35), falta aplicar no Supabase real.** Revisar `supabase/migrations/001_schema.sql` antes de aplicar: `pedidos` → `contratacoes` (`profissional_id` obrigatorio, `data_desejada`, status `solicitada/aceita/recusada/cancelada/concluida`, trigger de transicao BR06, BR09, BR10), nova tabela `mensagens` (RLS so das partes, BR08, limite 1000 chars, Realtime), contato da outra parte so apos aceite (BR07), seed e `supabase/README.md`; registrar D5 em `docs/DECISOES.md`. Aplicar no Supabase real. | Alta (bloqueia US-001) | 3 | Sem isso nenhuma story roda contra o banco real |
| DEBT-001 | README do projeto: rastreabilidade HU × tela × tabela (secao 9), contratacao no minimundo/HUs, secao "Como rodar o projeto" | Alta (DoD do Marco 2) | 2 | Avaliacao da disciplina cobra rastreabilidade |
| DEBT-002 | Revisao final por agente que nao escreveu o codigo: fluxos com usuarios do seed, tentativa de burlar RLS, checklist de acessibilidade/mobile | Alta (DoD do Marco 2) | 2 | Garante seguranca e qualidade antes da entrega |

---

## Spikes & Research

| ID | Topico | Objetivo | Time-box | Status |
|----|--------|----------|----------|--------|
| - | - | - | - | - |

---

## Roadmap Overview

### Marco 2 (atual)

- [ ] DEBT-003 + EPIC-001 + EPIC-002 — primeiro vertical slice (visitante → categoria → perfil → WhatsApp)
- [ ] EPIC-003 — conta e acesso
- [ ] EPIC-004 — contratacao no app + chat
- [ ] DEBT-001 e DEBT-002

### Marco 3

- [ ] EPIC-005 — orcamento, pagamento simulado, avaliacoes, favoritos, testes e deploy de teste

---

## Rastreabilidade Requisitos → Stories

| Requisito | Story |
|-----------|-------|
| FR01 | US-001 |
| FR02 | US-002 |
| FR03, FR04 | US-003 |
| FR05, FR07, FR09 | US-004 |
| FR06 | US-005 |
| FR08 | US-006 |
| FR10 | US-007 |
| FR11, FR13 | US-009 |
| FR12 | US-008 |
| FR14 | US-010 |
| BR01, BR02 | US-005 (+ DEBT-003 no banco) |
| BR03 | US-002, US-006 |
| BR04 | US-003 |
| BR05 | US-004 |
| BR06 | US-008, US-009 (+ DEBT-003) |
| BR07 | US-009 (+ DEBT-003) |
| BR08 | US-010 (+ DEBT-003) |
| BR09, BR10 | US-007 (+ DEBT-003) |
| NFR01, NFR03, NFR06 | US-001 (e criterio comum de todas) |
| NFR02 | US-002, US-003 |
| NFR04, NFR05 | criterio comum de todas as stories de tela |
| NFR07 | US-010 |

---

## IA Insights

### Priorizacao Sugerida

Comecar por DEBT-003 → US-001 → US-002 → US-003: entrega a jornada principal de ponta a ponta sem depender do fluxo de autenticacao (profissionais aprovados vem do seed). Em seguida EPIC-003 (destrava a contratacao) e por ultimo EPIC-004.

### Riscos Identificados

- Schema ainda nao aplicado no Supabase real (DEBT-003 mitiga).
- Escopo do Marco 2 cresceu para 47 pontos de stories + 7 de debitos; data de entrega ainda nao informada.
- Realtime + RLS em `contratacoes` e `mensagens` precisa ser validado no ambiente real.

### Oportunidades

- Contratacao concluida e o gancho natural para HU04 (avaliar so quem contratou) no Marco 3.

---

## Backlog Refinement Notes

**Ultima sessao:** 2026-10-09

### Decisoes

- Diretorio publico; login so para contratar (Discovery rev. 1).
- Contratacao direta pelo perfil substitui o pedido aberto para a categoria; Marco 2 inclui data/horario e chat; orcamento e pagamento simulado no Marco 3; gateway real fora (rev. 2).
- `home-cliente.html` publica com link "Entrar"; `index.html` continua sendo o login.

### Items Refinados

- US-001 a US-010 — ver `docs/stories/`.

### Proximas sessoes

- **Data:** a definir
- **Foco:** `/sprint-planning` do primeiro vertical slice; refinar EPIC-005 antes do Marco 3.

---

## Glossario e Definicoes

| Termo | Definicao |
|-------|-----------|
| Contratacao | Solicitacao de servico feita por um cliente a um profissional especifico, com ciclo `solicitada → aceita/recusada/cancelada → concluida`. |
| Profissional aprovado | Profissional com `status_aprovacao = 'aprovado'`, definido manualmente pela equipe no painel do Supabase. |
| Visitante | Pessoa sem login; pode navegar no diretorio e ver perfis. |
