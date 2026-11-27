# Sprint Retrospective - Sprint 04

**Data:** 2026-11-27 (a sprint vai até 30/11; os números são de 23/11 a 27/11)
**Sprint período:** 2026-11-23 - 2026-11-30
**Participantes:** Bruno Alves (PO); [EQUIPE] demais integrantes
**Facilitador:** Bruno Alves, com rascunho preparado por IA a partir dos artefatos

**Status:** RASCUNHO. Os números vêm do git, do backlog, dos roteiros SQL e dos testes no banco real. As opiniões e os action items são propostas: a equipe confirma ou ajusta.

**Sprint Goal:** "A triagem automática marca quem está pronto para aprovar, o profissional entende o motivo da pendência ou da recusa e reenvia, e o admin gerencia categorias e acompanha indicadores."
**Resultado do goal:** atingido. As 4 stories do goal (US-016, US-013, US-018, US-017) estão em Done, junto com 3 adiantadas (US-019, US-020, US-021).

---

## 📊 Sprint Metrics

Fontes: `docs/sprints/sprint_planning_04.md` (Execução real), `docs/product_backlog.md`, `git log` de 23/11 a 27/11 e os roteiros de `supabase/testes/`.

| Métrica | Planejado | Realizado | Delta |
|---------|-----------|-----------|-------|
| **Story Points (implementados)** | 16 | 27 (US-016 5, US-017 5, US-019 5, US-020 3, US-013 3, US-021 3, US-018 3) | +11 |
| **Story Points (Done dentro da sprint)** | 16 | 27 | **primeira sprint com Done dentro do prazo** |
| **Stories completadas** | 4 | 7 | +3 (US-019, US-020 e US-021, adiantadas) |
| **Dívidas tratadas fora das stories** | 0 | DEBT-009, DEBT-010 (itens 1 a 4), DEBT-011, DEBT-013 | +4 |
| **Trabalho da Sprint 05 feito no período** | 0 | 15 pts (US-022, US-023, US-025, US-026, DEBT-012), todos em 27/11, em Review | +15 |
| **Bugs encontrados** | - | 19 achados na banca de 26/11 (4 graves corrigidos no DEBT-010; 5 a 19 abertos) + 4 testes desatualizados e 1 travamento de teste (ver abaixo) | - |
| **Velocity (Done na sprint)** | 16 | 27 | Sprints 01 a 03 fecharam com 0 |

Outros dados:

- **Commits:** 52 (sem contar merges) de **1 autor** (Bruno Alves). Por dia: 7 em 23/11, 2 em 24/11, 0 em 25/11, 16 em 26/11 e 27 em 27/11.
- **PRs mesclados:** 19, e todas as branches de feature foram apagadas depois do merge. Só resta a `main`.
- **Banco:** migrations 005 a 019 aplicadas pelo PO no SQL Editor, cada uma com autoconferência e roteiro que se desfaz sozinho. Todos os roteiros voltaram 100% "ok".
- **Testes no banco real (27/11):** `contratacao_api.mjs` 71/71 e `contratacao_telas.mjs` 99/99. Antes da correção eram 66/67 e 95/99.
- **Sem CI.** Os testes de tela com sessão e banco simulados (Playwright + Edge) rodam só na máquina de quem implementou e ficam numa pasta temporária, fora do repositório.

**Achados de qualidade da sprint:**

| Origem | Achado | Situação |
|---|---|---|
| Banca de 26/11 | Reprovou a primeira versão: senha no README, telefone pessoal legível, banco sem limite de tamanho, US-011 em branch com caminhos antigos | Itens 1 a 4 corrigidos (DEBT-010, `014`); 5 a 19 em aberto |
| `contratacao_telas.mjs` | 4 checks desatualizados desde o DEBT-009 (menu sem ids) e a 014 (telefone fechado): a suíte não tinha sido rodada depois dessas mudanças | Corrigidos em 27/11 |
| `contratacao_telas.mjs` | Ficou 75 minutos travada sem mostrar nada: o script espera o navegador sem limite de tempo | Contornado (rodado de novo); a causa continua no script |
| Dados de teste | O US7-09 gravava uma contratação só com espaços e sem a etiqueta `[TESTE AUTO]` (id 207), que a limpeza não apagava | Resolvido pelo DEBT-012 (o banco recusa) |
| Banco real | Avaliação do seed sem contratação; edição de avaliação aceitava qualquer coluna | Resolvidos na `018` (US-025) |

**Velocity nas últimas 4 sprints:**

| Sprint | Pontos planejados | Pontos implementados | Pontos em Done dentro da sprint |
|---|---|---|---|
| Sprint 01 | - | 33 | 0 |
| Sprint 02 | 16 | 16 | 0 |
| Sprint 03 | 16 | 15 | 0 |
| **Sprint 04** | **16** | **27** | **27** |

---

## 😊 What Went Well?

Observações dos dados, a confirmar:

- ✅ **Done dentro da sprint, pela primeira vez:** a meta da retrospectiva anterior era ≥ 70% dos pontos em Done até o último dia. Foram 100% dos planejados, e mais 11 pontos.
- ✅ **A revisão independente entrou no calendário:** a banca de 26/11 reprovou a primeira versão e pegou problemas de segurança que os testes não pegavam (senha, telefone, limites). Foram corrigidos no dia seguinte.
- ✅ **Merge rápido e `main` limpa:** 19 PRs mesclados e branches apagadas logo depois. O planejamento e as retrospectivas que estavam fora da `main` foram recuperados (DEBT-011).
- ✅ **O padrão de banco se manteve:** 15 migrations seguidas, cada uma com autoconferência e roteiro que se desfaz sozinho, e nenhuma voltou com falha depois de aplicada.
- ✅ **Conferir o banco real antes de escrever pegou problemas cedo:** a avaliação do seed sem contratação, a edição de avaliação que aceitava qualquer coluna, a linha 207 em branco e o primeiro nome que virava "Cliente" com tab. Tudo foi achado lendo o banco antes de pedir a migration.
- ✅ **A suíte de testes real voltou a ficar verde:** de 66/67 + 95/99 para 71/71 + 99/99.

[EQUIPE] O que mais funcionou?

---

## 😞 What Didn't Go Well?

Observações dos dados, a confirmar:

- ❌ **Ainda um autor só:** 52 commits, todos de uma pessoa, para 6 nomes no planejamento. A meta de ≥ 3 autores não foi atingida pela segunda sprint seguida. O "Done" desta sprint veio do PO com IA, não das duplas.
- ❌ **Escopo puxado demais para frente:** a Sprint 05 (01/12 a 08/12) teve todo o escopo implementado em 27/11, antes de começar. A sprint planejada fica sem trabalho, e as duplas que iam fazer orçamento e avaliação não fizeram.
- ❌ **Trabalho concentrado no fim:** 43 dos 52 commits em 26 e 27/11, e nenhum em 25/11. Pouco tempo para revisão entre o que foi feito e o fim da sprint.
- ❌ **Suíte real não roda a cada mudança:** o DEBT-009 e a 014 quebraram 4 checks de `contratacao_telas.mjs` que ninguém viu até 27/11. O teste também pode travar sem aviso.
- ❌ **Testes de tela fora do repositório:** os testes simulados que validaram US-022 a US-026 estão numa pasta temporária, que já foi apagada uma vez entre 13/11 e 23/11.
- ❌ **Marco 2 continua sem fechar:** DEBT-001 (README) e DEBT-002 (revisão final) seguem abertos, e o prazo da ação anterior era 30/11. A US-011 continua em Review (falta a Redirect URL no Supabase).
- ❌ **Achados da banca em aberto:** os itens 5 a 19 do DEBT-010 não têm sprint nem responsável.

[EQUIPE] O que mais atrapalhou?

---

## 💡 What Can We Improve?

- 🔧 **Respeitar a fronteira da sprint:** puxar trabalho da próxima só quando a atual estiver em Done e com a equipe sabendo, para não esvaziar o planejamento seguinte.
- 🔧 **As duplas implementam:** o PO revisa e aprova; a IA ajuda quem está com a story.
- 🔧 **Testes que não somem e não travam:** versionar os testes de tela e pôr limite de tempo nas esperas do navegador.
- 🔧 **Rodar a suíte real depois de mudança transversal:** menu, privacidade, RLS.

---

## 🎯 Action Items

Revisão da Sprint 03:

| Ação da Sprint 03 | Status | Observação |
|---|---|---|
| Revisão independente no penúltimo dia útil; só é entregue o que estiver em Done no último dia | Concluída em parte | A banca aconteceu em 26/11 (4º dia útil de 6) e as 7 stories chegaram a Done antes de 30/11. Não foi marcada com antecedência: foi pedida no próprio dia |
| Cada responsável abre o PR da própria story | Não atingida | 1 autor; todos os PRs saíram da mesma conta |
| Mesclar planejamento e retrospectiva na `main` em até 1 dia útil | Concluída | Sprint 05, retro 03 e manifesto mesclados no mesmo dia (27/11) |
| Registrar o achado US7-09 como DEBT-012 | Concluída | Registrado e implementado (`017`); US7-09 passa |
| Fechar DEBT-001 e DEBT-002 até 30/11 | Não iniciada | Os dois seguem abertos |

Propostas para a Sprint 05, a decidir pela equipe:

| Ação | Responsável | Prazo | Métrica de sucesso | Status |
|------|-------------|-------|--------------------|--------|
| Replanejar a Sprint 05 (01 a 08/12), já que o escopo dela está em Review: code review cruzado de US-022 a US-026 e DEBT-012 pelas duplas, itens 5 a 19 do DEBT-010, DEBT-001, DEBT-002 e US-011 | Bruno Alves (PO) com a equipe | 01/12 | Sprint 05 com planejamento revisado e responsável por item; as 5 entregas em Review chegam a Done com revisão de quem não escreveu | [ ] |
| As duplas fazem a revisão e os ajustes das entregas da Sprint 05 pela própria conta (PR ou comentário de review) | [EQUIPE] cada dupla | 08/12 | Commits ou reviews de ≥ 3 autores no período | [ ] |
| Versionar os testes de tela simulados em `supabase/testes/` (ou pasta combinada) e pôr timeout nas chamadas ao navegador de `contratacao_telas.mjs`. Playwright é dependência nova: **precisa de aprovação** (regra 6) | [EQUIPE] | 08/12 | Testes de US-022 a US-026 no repositório; nenhuma execução travada sem mensagem | [ ] |
| Rodar `contratacao_api.mjs` e `contratacao_telas.mjs` antes do merge de qualquer mudança em menu, RLS ou privacidade, e registrar o resultado no PR | Quem abrir o PR | A partir da Sprint 05 | Nenhum check desatualizado descoberto depois do merge | [ ] |
| Fechar DEBT-001 e DEBT-002 (Marco 2) | Luiz Felipe Moro (DEBT-001), Lucas dos Santos Felipe (DEBT-002), conforme o planejamento | 08/12 | As duas em Done no backlog | [ ] |

---

## 🤖 IA-Assisted Development Insights

### What worked well with IA?
- Ler o banco real (só leitura) antes de escrever a migration evitou constraint que falharia, dado de teste esquecido e brechas de permissão.
- Migrations com autoconferência e roteiros que o PO só cola no SQL Editor: 15 seguidas sem retrabalho no banco.
- Testes de tela com sessão e banco simulados pegaram problemas de experiência antes do banco real: a página que ficava 7 s em "Carregando" quando só a avaliação falhava, e o "Contratar" empurrado para baixo pela lista de avaliações.

### Where IA could be improved?
- Continuou escrevendo tudo pela conta de uma pessoa, e rápido o bastante para esvaziar a Sprint 05 antes de ela começar.
- Deixou os testes de tela só na pasta temporária.
- Rodou um teste longo sem limite de tempo e só percebeu o travamento depois de 75 minutos.
- Scripts de edição de documento falharam no meio algumas vezes (acentos, texto repetido), o que gerou commits de documentação parciais.

### New IA techniques to try?
- Usar a IA como revisora das duplas (code review e banca) em vez de implementadora.
- Pedir à IA, no início de cada sprint, a conferência de fronteira: o que é desta sprint, o que já está pronto e o que não deve ser puxado.

---

## 📈 Team Health Check

**Escala: 1 (😞) a 5 (😊)**

| Dimensão | Rating | Comentários |
|----------|--------|-------------|
| **Colaboração** | [EQUIPE] | Dados: 1 autor de commits para 6 responsáveis, pela segunda sprint seguida |
| **Autonomia** | [EQUIPE] | Dados: escrita no banco só pelo PO; toda migration depende de uma volta com ele |
| **Clareza de requisitos** | [EQUIPE] | Dados: discovery e requirements do Marco 3 aprovados (G0 e G1) antes das stories; nenhuma `[PRECISA CLARIFICAR]` aberta |
| **Ferramentas/Infraestrutura** | [EQUIPE] | Dados: sem CI; testes de tela fora do repositório; Node e Edge disponíveis só numa máquina |
| **Work-life balance** | [EQUIPE] | Dados: 43 de 52 commits em 2 dias |

---

## 🎓 Learnings & Knowledge Share

- **Técnicas aprendidas:**
  - Permissão por coluna para limitar o que o app grava, como na `018`: só nota e comentário na edição.
  - Função `security definer` que entrega só o necessário, como na `019`: primeiro nome, sem id do cliente.
  - Trigger sem `security definer` de propósito, porque `eh_papel_cliente_api()` olha o `current_user` (`016`).
  - `~ '\S'` em vez de `btrim` para detectar texto em branco (`017`).
- **Comportamento do supabase-js:** em falha de rede, ele tenta de novo sozinho, por uns 7 s, as leituras GET. Leituras que não são essenciais à tela não devem segurar o carregamento dela.
- **Documentação criada:** breakdowns de US-013, US-016 a US-026, DEBT-012; discovery e requirements do Marco 3; `supabase/README.md` com as migrations 005 a 019.
- **Pair programming insights:** [EQUIPE] as duplas chegaram a trabalhar juntas?

---

## 📝 Notes & Additional Comments

- A sprint ainda vai até 30/11; esta retrospectiva usa os dados até 27/11 (decisão do PO).
- O backlog ainda mostra o DEBT-013 "Em Review (branch `fix/DEBT-013-sair-no-topo`)", mas ele foi mesclado em 27/11. Ajustar na próxima atualização do backlog.
- US-022 (mesclada), US-023, US-025, US-026 e DEBT-012 estão mesclados e em Review, aguardando code review e aprovação do PO para Done.
- Observação da US-026 aguardando decisão do PO: a leitura direta de `avaliacoes` mostra a qualquer visitante o `usuario_id` de quem avaliou (proposta de DEBT-014, em `docs/tasks/breakdown_US-026.md`).

---

## 🔄 Continuação para Próxima Sprint

### Keep Doing
- Revisão independente antes do fim da sprint.
- Conferir o banco real, só lendo, antes de escrever a migration.
- Mesclar e apagar a branch no mesmo dia.

### Stop Doing
- Implementar o escopo da próxima sprint antes de ela começar.
- Deixar teste de tela só na máquina de quem fez.
- Rodar a suíte real só no fim.

### Start Doing
- Duplas implementando; PO e IA revisando.
- Testes versionados e com limite de tempo.
- Suíte real no PR de toda mudança transversal.
