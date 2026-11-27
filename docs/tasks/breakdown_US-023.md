# Task Breakdown: [US-023] Concluir só com valor aprovado e cancelar antes de aprovar

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO); dupla 1 da Sprint 05 a definir
**Estimativa total:** 3 pontos (~5 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (regras novas do trigger com `errcode` 22023 / 42501 e mensagem em português, traduzidas por `traduzirErroContratacao` em `js/servicos/contratacao-comum.js`)
**BDD associado:** N/A (roteiro SQL `supabase/testes/016_conclusao_com_orcamento.sql` + testes de tela)
**Behavior change:** YES (altera a BR06 pela BR23)
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. Regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (BR23, FR31, NFR13, NFR14), versionadas em SQL.
- **US exige Contract governado?** Não. O boundary é o Supabase (PostgREST) protegido por RLS e pelo trigger `validar_contratacao`.
- **Justificativa do Nivel ScrumAIDev:** comportamento observável com regra no banco; sem API própria nem runner de contrato.
- **Touch List aplicada:** `supabase/migrations/016_conclusao_com_orcamento.sql` (novo), `supabase/testes/016_conclusao_com_orcamento.sql` (novo), `supabase/README.md`, `supabase/testes/contratacao_api.mjs`, `supabase/testes/contratacao_telas.mjs`, `helpme-app/servico-andamento.html`, `helpme-app/js/telas/servico-andamento.js`, `helpme-app/js/servicos/contratacao-comum.js`. **Fora da Touch List preliminar:** `helpme-app/js/telas/espera-cliente.js` (uma frase: "Você cancelou esta **contratação**", porque agora o cancelamento também acontece depois do aceite).
- **Base da branch:** `main` com a US-022 mesclada (015 aplicada e conferida no banco real).
- **Banco real:** 1 contratação `aceita` sem orçamento; com a 016, ela só conclui depois de um valor aprovado.

## Checagem de Principios

- **É a abordagem mais simples?** Sim. A regra fica no trigger que já decide as transições (`validar_contratacao`, 001), com `create or replace` numa migration nova (DEBT-008). Nenhuma função ou tabela nova; a tela continua usando `mudarStatusContratacao` (update com filtro de status).
- **Dependência externa nova?** Não.
- **Escopo respeita a Touch List?** Sim, com a exceção registrada acima (texto do desfecho em `espera-cliente.js`).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Transições (BR23) | `solicitada → aceita/recusada` (profissional) e `solicitada → cancelada` (cliente) **sem mudança**, inclusive mensagens e códigos. `aceita → concluida`: as partes, **só com orçamento aprovado**. `aceita → cancelada` (novo): só o cliente, **só sem orçamento aprovado** (aguardando ou recusado não impedem). |
| Erros novos | Sem valor aprovado: `22023` "Combine e aprove o valor antes de concluir." Já aprovado: `22023` "O valor já foi aprovado: esta contratação não pode mais ser cancelada." Profissional cancelando aceita: `42501`. A tela mostra o texto do banco para 22023/42501, exceto o 42501 do RLS (em inglês), que vira texto fixo. |
| Sem `security definer` | `eh_papel_cliente_api()` olha o `current_user`; com `security definer` viraria `postgres` e o trigger deixaria de barrar o app. A leitura de `orcamentos` dentro do trigger passa pelo RLS da 015 (as partes leem) e só as partes atualizam a contratação. Ganha `search_path = ''` (tudo já qualificado). A autoconferência da 016 garante as duas coisas. |
| Corrida aprovar × cancelar/concluir | `responder_orcamento()` trava a linha da contratação (`for update`); o UPDATE do app espera e o trigger relê `orcamentos` com a resposta já gravada (READ COMMITTED). Na ordem inversa, `responder_orcamento` encontra a contratação `cancelada` e recusa. |
| Orçamento aguardando numa contratação cancelada | Fica `aguardando` (histórico); não pode mais ser respondido nem gerar novo envio (as funções da 015 exigem `aceita`). |
| Tela | `preencherAcoes()`: "Marcar como concluído" só com valor aprovado; sem ele, a frase "Combine e aprove o valor antes de concluir." para as duas partes e "Cancelar contratação" (`btn-perigo`, com confirmação) só para o cliente. Concluir e cancelar entram na mesma trava de duplo clique do orçamento. |
| Depois de cancelar | A releitura leva o cliente para `espera-cliente.html` ("Cancelada por você") e o profissional, pelo Realtime, para a lista (`contratacoes.html`, selo "Cancelada pelo cliente"). |

---

## Tasks Tecnicas

#### [TASK-001] Migration `016_conclusao_com_orcamento.sql` e roteiro SQL
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 2, 4 e 5; roteiro C1–C22 com todas as linhas "ok" no banco real.

#### [TASK-002] Concluir e Cancelar em `servico-andamento.html`
- **Estimativa:** 2 h
- **Dependências:** TASK-001
- **Critério de conclusão:** critérios 1, 3, 7, 8 e 9.

#### [TASK-003] Atualizar `contratacao_api.mjs` e `contratacao_telas.mjs`
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 6. Concluir passa a aprovar um valor antes (helper `aprovarValor`); `US9-04` muda de "cliente não cancela depois do aceite" para "profissional não cancela aceita"; novos `US23-01` a `US23-05` (API) e `UI23-01` a `UI23-06` (telas).

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| C1–C7 | Transições antigas: aceitar, recusar, cancelar solicitada; profissional cancelando solicitada, pulo para concluida, cliente aceitando, mudança de descrição | Iguais a antes | Done |
| C8–C12 | Aceita sem valor aprovado: cliente/profissional concluem (sem orçamento e com aguardando); profissional cancela; terceiro cancela/conclui | Recusados (22023 / 42501 / 0 linhas) | Done |
| C13–C16 | Cliente cancela aceita sem orçamento e com aguardando; aprovar depois de cancelada; cancelada volta | Cancela; o resto recusado | Done |
| C17–C20 | Com valor aprovado: cliente cancela; cliente e profissional concluem; concluida cancelada | Só concluir passa | Done |
| C21–C22 | Visitante; status finais | Nada muda; status conferem | Done |
| T1–T21 | Tela com sessão e banco simulados: estados por papel e situação do orçamento, duplo clique, recusa do banco (tela desatualizada), RLS em inglês, sem rede, redirecionamento depois de cancelar, 360px, 44px, Tab/foco | Todos passam | Done |
| US23-01..05, UI23-01..06 | Banco real pelos `.mjs` (gravam dados `[TESTE AUTO]`) | Todos passam | Done |

**Resultados (2026-11-27):** telas **23/23** (sessão e banco simulados: nenhum dado gravado); US-022 na mesma tela sem regressão (**23/23**). PO aplicou a `016`: roteiro **C1–C22 ok**. Banco real com login: API **66/67** (só `US7-09` falha, que é o DEBT-012 já registrado: espaços em descrição/endereço) e telas **99/99**. Os checks UI8-03, UI9-03, UI9-04 e UI9-10 foram atualizados porque estavam desatualizados desde o DEBT-009 (menu montado sem ids) e a 014 (`usuarios.telefone` fechado; o teste passou a usar `meu_telefone()`).
