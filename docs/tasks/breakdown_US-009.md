# Task Breakdown: [US-009] Acompanhar, cancelar e concluir contratacao

**Data:** 2026-10-23
**Participantes:** a definir (responsavel nao nomeado na Sprint 02)
**Estimativa total:** 5 pontos (~7 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** `docs/bdd/contratacao.feature` (revisao manual — cenarios de BR06 e BR07)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicacao no GitHub pendente de decisao da equipe)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Nao
- **US exige Contract governado?** Nao
- **Justificativa do Nivel ScrumAIDev:** transicoes (BR06) no trigger `validar_contratacao`; contato da outra parte so apos o aceite (BR07) pela funcao `contato_contraparte`; leitura limitada as partes pelo RLS. O front so consome.
- **Justificativa:** sem API propria; nenhuma mudanca de banco (D7).
- **Touch List aplicavel (D8):** `helpme-app/espera-cliente.html`, `helpme-app/js/espera-cliente.js` (novo), `helpme-app/servico-andamento.html`, `helpme-app/js/servico-andamento.js` (novo), `helpme-app/js/contratacao-comum.js` (novo), `helpme-app/contratacoes.html`, `helpme-app/js/contratacoes.js`, `helpme-app/assets/css/contratacao.css`, `helpme-app/home-cliente.html`, `helpme-app/js/cliente.js`, `helpme-app/solicitar-pedido.html`, `helpme-app/js/solicitar-pedido.js`.
- **Runner BDD / contrato / mock:** N/A (revisao manual)

---

## Checagem de Principios (condicional)

Aplicavel (`Behavior change` = YES).

- [x] Abordagem mais simples: duas telas de detalhe (uma por fase, D8) que leem a mesma linha de `contratacoes` e redirecionam entre si conforme o status; a lista existente ganha a visao do cliente.
- [x] Sem dependencia nova. Funcoes repetidas nas tres telas (buscar contratacao, contato, mudar status, Realtime, rotulos) ficam em `js/contratacao-comum.js`, no mesmo estilo de `js/telefone.js`.
- [x] Touch List respeitada.

**Complexidade Aceita:**

| Desvio | Por que e necessario | Alternativa mais simples rejeitada porque |
|---|---|---|
| Duas telas de detalhe em vez de uma | Decisao D8 do PO (manter `espera-cliente.html` e `servico-andamento.html`) | Uma tela unica (`contratacao.html`) foi o plano original, trocado pela D8 |

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] `js/contratacao-comum.js`
- **Estimativa:** 1 h
- **Criterio de conclusao:** `buscarContratacao`, `buscarContatoContraparte`, `mudarStatusContratacao` (update condicionado ao status atual, devolve se mudou), `assinarContratacao` (Realtime por id), `rotuloStatusContratacao`, `textoDataContratacao`, `lerIdContratacaoDaUrl`.

#### [TASK-002] `espera-cliente.html` — contratacao `solicitada`
- **Estimativa:** 1,5 h
- **Criterio de conclusao:** mostra profissional, descricao, endereco, data e status, atualizando em tempo real (criterio 2); "Cancelar" enquanto `solicitada` (criterio 3); ao virar `aceita`, vai sozinha para `servico-andamento.html`; recusada/cancelada mostram o desfecho; terceiro ve "Contratacao nao encontrada" (criterio 6).

#### [TASK-003] `servico-andamento.html` — contratacao `aceita`/`concluida`
- **Estimativa:** 1,5 h
- **Criterio de conclusao:** cada parte ve nome, Ligar e WhatsApp da outra via `contato_contraparte` (criterio 4); qualquer parte conclui (criterio 5); depois de concluida nao ha acoes; tempo real.

#### [TASK-004] Visao do cliente em `contratacoes.html` + menu
- **Estimativa:** 1,5 h
- **Criterio de conclusao:** cliente ve as proprias contratacoes em tempo real, com o nome do profissional e link "Acompanhar" (criterio 1); profissional ganha o link "Ver contato e detalhes" nas aceitas; home do cliente com "Minhas contratacoes".

#### [TASK-005] Formulario leva ao acompanhamento
- **Estimativa:** 0,25 h
- **Criterio de conclusao:** `solicitar-pedido.js` troca o painel TEMPORARIO por `espera-cliente.html?id=<id>` (criterio 4 da US-007).

### Testing Tasks

#### [TASK-006] Testes
- **Estimativa:** 1,25 h
- **Criterio de conclusao:** harness com DOM/Supabase falsos para as tres telas + roteiro manual com duas abas (cliente e profissional) no Supabase real.

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006.
