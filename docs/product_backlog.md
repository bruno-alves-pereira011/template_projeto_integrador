# Product Backlog

**Produto:** HelpMe — Hub de Contatos de Emergencia para Servicos Residenciais
**Product Owner:** Equipe do Projeto Integrador (IFES Campus Serra)
**Ultima atualizacao:** 2026-10-16 (revisao geral do projeto para o Fluxo 3)

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

**Notas do Fluxo 3 (2026-10-16):** antes de US-007, fazer DEBT-004 (`main` estavel), DEBT-005 (decidir `refactor/ui-polish`) e DEBT-006 (remover legado de pedidos). US-008 troca `DESTINO_PROFISSIONAL_APROVADO` em `helpme-app/js/sessao.js` por `contratacoes.html`; US-009 inclui o item "Minhas contratacoes" no menu do cliente.

#### [EPIC-006] Administracao e aprovacao de profissionais

**Objetivo:** Area administrativa centralizada no app e triagem automatica dos profissionais em analise, substituindo a aprovacao manual pelo Table Editor (D2 → D6 proposta).
**Valor de negocio:** Alto
**Estimativa:** 29 pontos (+ 6 pontos Could)
**GitHub Epic Issue:** -
**Origem:** `docs/discovery/helpme-mvp-marco2.md` (revisao 3). Discovery e Requirements rev. 3 aprovados (G0 e G1 em 2026-10-16). Stories aprovadas no Modo Backlog em 2026-10-16 (US-016 dividida em US-016 + US-021). Primeiro vertical slice: US-014 + US-015 + US-013.

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-014 | - | Papel de administrador e area admin | 5 | Backlog | - | - | - | docs/bdd/aprovacao_profissionais.feature |
| US-015 | - | Fila de analise e aprovacao (individual e em lote) | 5 | Backlog | - | - | - | docs/bdd/aprovacao_profissionais.feature |
| US-013 | - | Motivo da pendencia/recusa e reenvio para analise | 3 | Backlog | - | - | - | docs/bdd/aprovacao_profissionais.feature |
| US-016 | - | Triagem automatica: checagens obrigatorias | 5 | Backlog | - | - | - | docs/bdd/aprovacao_profissionais.feature |
| US-021 | - | Triagem automatica: sinais de suspeita e reanalise de aprovados | 3 | Backlog | - | - | - | docs/bdd/aprovacao_profissionais.feature |
| US-017 | - | Painel de indicadores do administrador | 5 | Backlog | - | - | - | - |
| US-018 | - | Gestao de categorias (criar, editar, desativar) | 3 | Backlog | - | - | - | - |
| US-019 | - | Suspender/reativar profissional aprovado (Could) | 3 | Ideia | - | - | - | - |
| US-020 | - | Consulta somente-leitura de contratacoes, sem chat (Could) | 3 | Ideia | - | - | - | - |

#### [EPIC-007] Conta do cliente

**Objetivo:** Fechar lacunas de conta encontradas na revisao de 2026-10-16.
**Valor de negocio:** Medio
**Estimativa:** 5 pontos
**GitHub Epic Issue:** -

##### User Stories

| ID | Issue | Titulo | Story Points | Status | Sprint | Spec | Contract | BDD |
|----|-------|--------|--------------|--------|--------|------|----------|-----|
| US-011 | - | Esqueci minha senha | 3 | Backlog | - | - | - | - |
| US-012 | - | Meu perfil do cliente (nome e telefone) | 2 | Backlog | - | - | - | - |

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
| (a refinar) | - | HU04 — Avaliar profissional (1–5 + comentario). **Atencao:** a politica `avaliacoes: autor cria` (001) deixa qualquer usuario logado avaliar; a HU04 precisa exigir contratacao `concluida` | - | Ideia | - | - | - | - |
| (a refinar) | - | HU05 — Favoritar profissional | - | Ideia | - | - | - | - |

---

## Technical Debt & Bugs

| ID | Descricao | Prioridade | Estimativa | Impacto |
|----|-----------|------------|------------|---------|
| DEBT-003 | **Sprint 01 — implementado (a701e35), falta aplicar no Supabase real.** Revisar `supabase/migrations/001_schema.sql` antes de aplicar: `pedidos` → `contratacoes` (`profissional_id` obrigatorio, `data_desejada`, status `solicitada/aceita/recusada/cancelada/concluida`, trigger de transicao BR06, BR09, BR10), nova tabela `mensagens` (RLS so das partes, BR08, limite 1000 chars, Realtime), contato da outra parte so apos aceite (BR07), seed e `supabase/README.md`; registrar D5 em `docs/DECISOES.md`. Aplicar no Supabase real. | Alta (bloqueia US-001) | 3 | Sem isso nenhuma story roda contra o banco real |
| DEBT-004 | Abrir e mesclar o PR `fix/sprint01-fechamento` → `main`. A `main` esta quebrada: `completar-perfil.js` chama `minha_data_nascimento()`, que so existe na branch (leva `e2be2b8`, `6bb2aa5`, `f603172` e a mudanca de caminhos dos docs) | **Critica (bloqueia tudo)** | 1 | `completar-perfil.html` falha em `main` |
| DEBT-005 | Decidir e mesclar (ou descartar) `origin/refactor/ui-polish` (reescreve `dashboard.css`, ~1.400 linhas) antes de criar telas novas | Alta (antes de US-007) | 1 | Conflito em todas as telas do Fluxo 3 e do admin |
| DEBT-006 | Remover o legado de pedidos (D5): `feed-profissional.html`, `js/profissional.js` (le `pedidos`, que nao existe, e nao usa `exigirSessao`), `solicitar-pedido.html`, `espera-cliente.html`, `servico-andamento.html` (so comentarios) | Alta (Sprint 02) | 1 | Codigo morto quebrado e contrario a FR09 |
| DEBT-007 | Fixar versao exata da CDN `@supabase/supabase-js@2` em todos os HTML | Baixa | 1 | App pode quebrar sozinho com versao nova |
| DEBT-008 | Banco real ja tem dados: daqui em diante so migrations incrementais (`003_*`, `004_*`); nao editar nem reaplicar o `001` (reaplicar apaga dados e desfaz o `002`). Toda tabela nova com RLS no mesmo script (o `001` da `grant ... on all tables to authenticated`) | Alta (regra de trabalho) | 0 | Perda de dados / tabela exposta |
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

- [ ] DEBT-003 + EPIC-001 + EPIC-002 — primeiro vertical slice (visitante → categoria → perfil → WhatsApp) — implementado, em Review
- [ ] EPIC-003 — conta e acesso — implementado, em Review
- [ ] EPIC-004 — contratacao no app + chat (Fluxo 3)
- [ ] EPIC-006 — administracao e aprovacao (pendente Discovery/Requirements rev. 3)
- [ ] DEBT-001 e DEBT-002

### Ordem de execucao recomendada (revisao de 2026-10-16, aprovada pelo PO)

1. **Fechamento da Sprint 01:** DEBT-004 → testes manuais US-001 a US-006 no Supabase real (recriar `prof1@helpme.test`) → `/sprint-retrospective` → DEBT-005.
2. **Sprint 02 — nucleo do Fluxo 3:** DEBT-006, US-007, US-008, US-009 (~16 pts). Em paralelo, sem tocar no front: Discovery/Requirements rev. 3 do EPIC-006.
3. **Sprint 03:** US-010 (chat), US-014, US-015, US-013 — substitui o Table Editor.
4. **Sprint 04:** US-016 + US-021 (triagem automatica), US-017, US-018, US-011, US-012, DEBT-001, DEBT-002 — fecha o Marco 2.
5. **Marco 3:** EPIC-005, US-019, US-020, sinais pos-aprovacao (Nivel C).

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
| FR15, BR11, NFR08 | US-014 |
| FR17, FR18, FR19, BR15, BR16, BR19, NFR10 | US-015 |
| FR21, BR17 | US-013 |
| FR20, BR12, BR13 | US-016 |
| BR14, BR18 | US-021 |
| FR16, NFR09 | US-017 |
| FR22, BR20 | US-018 |
| FR23, BR22 | US-011 |
| FR24 | US-012 |
| FR25, FR26, BR21 | US-019, US-020 (Could) |
| NFR11 | US-014, US-015, US-016 (criterio comum) |

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
