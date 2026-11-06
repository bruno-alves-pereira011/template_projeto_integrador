# Task Breakdown: [US-010] Chat em tempo real na contratacao

**Data:** 2026-11-06
**Participantes:** Bruno Alves
**Estimativa total:** 5 pontos (~7 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** `docs/bdd/contratacao.feature` (revisao manual — cenarios de BR08 e NFR07)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (dispensado por decisao do usuario em 2026-11-06; ver abaixo)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Nao
- **US exige Contract governado?** Nao
- **Justificativa do Nivel ScrumAIDev:** quem le e quem escreve (BR08), o limite de tamanho (NFR07) e o horario do servidor ja estao no RLS, no `check` e no trigger `validar_mensagem` de `mensagens`. O front so consome.
- **Justificativa:** sem API propria; nenhuma mudanca de banco (`mensagens` e a publicacao Realtime ja existem no `001`, D7).
- **Touch List aplicavel (D9):** `helpme-app/contratacao.html` (novo), `helpme-app/js/chat.js` (novo), `helpme-app/js/contratacao-comum.js`, `helpme-app/espera-cliente.html`, `helpme-app/js/espera-cliente.js`, `helpme-app/servico-andamento.html`, `helpme-app/js/servico-andamento.js`, `helpme-app/js/contratacoes.js`, `helpme-app/assets/css/contratacao.css`.
- **Desvio da Touch List da story:** estilos em `contratacao.css`, nao em `dashboard.css` (arquivo criado para evitar conflito com `refactor/ui-polish`, DEBT-005).
- **Runner BDD / contrato / mock:** N/A (revisao manual)

### Dispensas registradas (decisao do usuario em 2026-11-06)

- A US-010 foi iniciada sem `sprint_planning_03.md`, sem a retrospectiva da Sprint 02 e sem publicacao no GitHub (passo 0 do `/feature-development`). A retrospectiva e o planejamento da Sprint 03 continuam pendentes.
- Base da branch: `main`, que ja contem a US-009. A story citava `feat/mvp-marco2`, que ficou desatualizada.

---

## Checagem de Principios (condicional)

Aplicavel (`Behavior change` = YES).

- [x] Abordagem mais simples: uma tela de chat para as duas partes em todos os status (D9). Embutir nas telas atuais exigiria deixar o profissional entrar em `espera-cliente.html` e reescrever redirecionamentos e textos feitos para o cliente.
- [x] Sem dependencia nova.
- [x] Touch List respeitada, com o desvio de CSS registrado acima.

**Complexidade Aceita:**

| Desvio | Por que e necessario | Alternativa mais simples rejeitada porque |
|---|---|---|
| Assinar o Realtime antes de ler o historico e remover duplicadas por `id` | Mensagem enviada entre a leitura e a assinatura se perderia | Ler e depois assinar deixa essa janela aberta |
| Ressincronizar ao voltar para a aba e ao reconectar | No celular o WebSocket cai em segundo plano; Realtime com RLS ainda nao foi validado no ambiente real | So o evento Realtime deixaria a conversa desatualizada sem aviso |

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] UI do chat (lista + campo + contador)
- **Estimativa:** 2 h
- **Criterio de conclusao:** `contratacao.html` com estados de carregando/erro/nao encontrada, lista com autor e horario (criterio 1), contador e label (criterios 3 e 8), sem rolagem horizontal em 360px e botoes de 44px (criterio 7).

#### [TASK-002] Carga do historico e envio
- **Estimativa:** 2 h
- **Criterio de conclusao:** historico em ordem cronologica; envio bloqueia vazio e mais de 1000 caracteres (criterio 3); conteudo sempre por `textContent` (criterio 5); falha mantem o texto digitado e mostra mensagem especifica.

#### [TASK-003] Assinatura Realtime filtrada por contratacao
- **Estimativa:** 1 h
- **Criterio de conclusao:** `postgres_changes` em `mensagens` com `contratacao_id=eq.<id>`, sem duplicar mensagem propria (criterio 2); rola para a ultima mensagem; ressincroniza ao reconectar.

#### [TASK-004] Bloqueio por status
- **Estimativa:** 0,5 h
- **Criterio de conclusao:** em `recusada`, `cancelada` ou `concluida` o campo fica desabilitado e o historico visivel, inclusive se o status mudar com a tela aberta (criterio 4).

#### [TASK-005] Links para o chat
- **Estimativa:** 0,5 h
- **Criterio de conclusao:** link em `espera-cliente.html`, `servico-andamento.html` e nos cards de `contratacoes.html`, inclusive para o profissional em `solicitada`, `recusada` e `cancelada`.

### Testing Tasks

#### [TASK-006] Testes
- **Estimativa:** 1 h
- **Criterio de conclusao:** harness com Supabase falso e navegador real + roteiro manual com duas abas no Supabase real (Plano de Testes da story), incluindo o criterio 6 via console.

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006.
