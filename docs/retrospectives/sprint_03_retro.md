# Sprint Retrospective - Sprint 03

**Data:** 2026-11-27 (feita 8 dias depois do fim da sprint; a reunião prevista para 23/11 não aconteceu)
**Sprint período:** 2026-11-12 - 2026-11-19
**Participantes:** Bruno Alves (PO); [EQUIPE] demais integrantes
**Facilitador:** Bruno Alves, com rascunho preparado por IA a partir dos artefatos

**Status:** RASCUNHO. Os números vêm do git, do backlog e do banco real. As opiniões e os action items são propostas: a equipe confirma ou ajusta.

**Sprint Goal:** "O administrador aprova ou recusa profissionais dentro do app (com histórico e sem Table Editor), e o cliente ganha 'Esqueci minha senha' e 'Meu perfil'."
**Resultado do goal:** atingido em código e em Review dentro da sprint; nenhum item chegou a Done até 19/11.

---

## 📊 Sprint Metrics

Fontes: `docs/sprints/sprint_planning_03.md`, histórico do git (`git log --all`, 10/11 a 22/11), `docs/product_backlog.md` e conferências de leitura no Supabase real.

| Métrica | Planejado | Realizado | Delta |
|---------|-----------|-----------|-------|
| **Story Points (implementados até 19/11)** | 16 | 15 (US-014 5, US-015 5, US-011 3, US-012 2) | -1 (DEBT-009 não feito) |
| **Story Points (Done até 19/11)** | 16 | 0 | -16 |
| **Story Points (Done até 27/11)** | - | 12 (US-014, US-015 e US-012, em 26/11) | US-011 segue em Review |
| **Stories completadas (Done na sprint)** | 4 + 1 débito | 0 (4 em Review) | -5 |
| **Trabalho adiantado da Sprint 04** | 0 | 10 (US-016 e US-017, implementadas em 13/11) | +10 |
| **Bugs encontrados** | - | 3 nas stories da sprint, achados pela banca de 26/11 (ver abaixo) | - |
| **Velocity (Done na sprint)** | - | 0 | Sprints 01 e 02 também fecharam com 0 |

Outros dados:

- **Commits:** 9 no período, **todos de 13/11** e de **1 autor** (Bruno Alves). De 14/11 a 22/11, nenhum commit.
- **Responsáveis do planejamento:** 6 pessoas nomeadas (Lucas, Davi, Luiz, Welcson, Gabriel e Bruno); só 1 aparece como autor.
- **Banco:** `003_admin.sql` (US-014) e `004_fila_analise.sql` (US-015) aplicadas pelo PO. Roteiro 003 11/11 e ponta a ponta com admin real 9/9.
- **Sem CI.** Os testes são roteiros SQL rodados no SQL Editor e scripts no navegador, sem nada versionado para as telas.

**Bugs das stories da sprint, achados na banca de revisão de 2026-11-26 (DEBT-010):**

| Story | Achado | Situação |
|---|---|---|
| US-014 | Senha do admin real escrita em `supabase/README.md` (repositório no GitHub) | Corrigido: senha fora do repositório e trocada no Supabase em 26/11 |
| US-012 | Banco sem limite de tamanho para nome e telefone (só a tela limitava) | Corrigido na `014_privacidade_limites.sql` |
| US-011 | Código numa branch com os caminhos antigos, fora do que ia para a `main` | Portado em 26/11; segue em Review |

**Velocity nas últimas 3 sprints:**

| Sprint | Pontos implementados | Pontos em Done dentro da sprint | Quando chegou a Done |
|---|---|---|---|
| Sprint 01 | 33 | 0 | Depois, por validação do PO |
| Sprint 02 | 16 | 0 | 09/11, 17 dias depois, por decisão do PO |
| Sprint 03 | 15 | 0 | 26/11, 7 dias depois, após a banca de revisão |

---

## 😊 What Went Well?

Observações dos dados, a confirmar:

- ✅ **A cadeia crítica saiu primeiro:** US-014 → US-015 (10 pontos), o maior risco do planejamento, ficou pronta e em Review no segundo dia útil da sprint.
- ✅ **O admin deixou de depender do Table Editor:** aprovação, recusa com motivo e histórico rodam no app, protegidos por funções `security definer`, sem política de leitura do admin sobre mensagens (BR21).
- ✅ **O padrão de teste do banco pegou:** o roteiro SQL que termina em `raise exception` (desfaz tudo e devolve o relatório) começou na 003 e foi usado em todas as migrations seguintes, da 004 à 014.
- ✅ **Sobrou capacidade:** US-016 e US-017, da Sprint 04, também foram implementadas no período.
- ✅ **Action items atendidos:** responsável nomeado para cada item, com no máximo metade dos pontos por pessoa; o DEBT-005 (`refactor/ui-polish`) foi decidido em 13/11.

[EQUIPE] O que mais funcionou?

---

## 😞 What Didn't Go Well?

Observações dos dados, a confirmar:

- ❌ **Terceira sprint seguida sem Done:** o risco estava no topo do planejamento ("meta de 70% dos pontos em Done dentro da sprint"), mas as stories ficaram em Review de 13/11 a 26/11. A revisão só aconteceu quando foi pedida de propósito (banca de 26/11), e ela reprovou a primeira versão.
- ❌ **Os nomes do planejamento não viraram commits:** 6 responsáveis nomeados, 1 autor. Como tudo foi feito num dia, não houve revisão por quem não escreveu, que era a primeira linha da DoD.
- ❌ **Um dia de trabalho, seis de silêncio:** 9 commits em 13/11 e nenhum de 14/11 a 22/11. Sem fluxo contínuo, ninguém percebeu que nada andava para Done.
- ❌ **Item planejado sumiu e o número foi reaproveitado:** o DEBT-009 da sprint (banco recusar `descricao` e `endereco` vazios, achado US7-09) nunca foi feito. Em 24/11 o mesmo ID passou a nomear outra dívida (navegação por papel). O achado US7-09 continua aberto: a 014 limitou o tamanho máximo, mas texto vazio ou só com espaços ainda passa pela API.
- ❌ **O planejamento ficou fora da `main`:** `sprint_planning_03.md`, `sprint_planning_04.md` e a retrospectiva da Sprint 02 só existiam numa branch nunca mesclada até 27/11 (DEBT-011). Durante a sprint, a `main` e o manifesto mostravam a Sprint 02 como ativa.
- ❌ **Branch criada sobre a base antiga:** a US-011 ficou com os caminhos de antes do DEBT-009 e teria conflitado no merge. Precisou ser portada.
- ❌ **Fechamento do Marco 2 incompleto:** DEBT-001 (README) e DEBT-002 (revisão final), previstos para 11/11, continuam abertos. Os itens humanos do Gate Done de US-007 a US-010 não têm registro de execução.
- ❌ **Segurança só apareceu na revisão:** a senha do admin foi documentada no README como parte da própria US-014.

[EQUIPE] O que mais atrapalhou?

---

## 💡 What Can We Improve?

- 🔧 **Done antes do fim da sprint:** a revisão independente (banca ou code review cruzado) entra no calendário, não fica para quando sobrar tempo.
- 🔧 **Documento de sprint na `main` no mesmo dia:** planejamento e retrospectiva são PRs pequenos; mesclar logo evita a `main` contar uma história velha.
- 🔧 **Um ID por item, para sempre:** item cancelado ou adiado continua com o mesmo número; item novo pega o próximo livre.
- 🔧 **Cada dupla commita a própria story:** o nome no planejamento precisa aparecer no histórico.

---

## 🎯 Action Items

Revisão da Sprint 02:

| Ação da Sprint 02 | Status | Observação |
|---|---|---|
| Executar o Gate Done de US-007 a US-010 | Parcial | PO moveu para Done em 09/11 com base nos testes automatizados; itens humanos (CH-13, CH-17, CH-18, CH-20 a CH-22) sem registro |
| Nomear responsável por item, com no máximo metade dos pontos por pessoa | Concluída | Feito no planejamento de 09/11 |
| Decidir `refactor/ui-polish` | Concluída | Descartada em 13/11 (prazo era 12/11); branch apagada em 27/11 |
| Meta: 70% dos pontos em Done dentro da sprint | Não atingida | 0% |
| Meta: commits de pelo menos 3 integrantes | Não atingida | 1 integrante |

Propostas para as próximas sprints, a decidir pela equipe:

| Ação | Responsável | Prazo | Métrica de sucesso | Status |
|------|-------------|-------|--------------------|--------|
| Marcar a revisão independente no penúltimo dia útil de cada sprint (banca ou code review cruzado), e só chamar de entregue o que estiver em Done no último dia | Bruno Alves (PO) | Sprint 05 | ≥ 70% dos pontos em Done até o último dia | [ ] |
| Cada responsável abre o PR da própria story; o PO não implementa story atribuída a outra pessoa | [EQUIPE] cada dupla | Sprint 05 | Commits de ≥ 3 autores no período da sprint | [ ] |
| Mesclar planejamento e retrospectiva na `main` em até 1 dia útil | Bruno Alves (PO) | A partir desta retrospectiva | Nenhum documento de sprint fora da `main` por mais de 1 dia | [ ] |
| Registrar o achado US7-09 como dívida nova (próximo ID livre, DEBT-012), sem reaproveitar o DEBT-009: `check (char_length(trim(...)) > 0)` em `contratacoes.descricao` e `endereco` | [EQUIPE] | Sprint 04 ou 05 | `contratacao_api.mjs` US7-09 passa || Registrado no backlog (PO, 2026-11-27) |
| Fechar DEBT-001 e DEBT-002, pendentes do Marco 2 | Luiz Felipe Moro (DEBT-001), Lucas dos Santos Felipe (DEBT-002), conforme o planejamento | 30/11 | As duas em Done no backlog | [ ] |

---

## 🤖 IA-Assisted Development Insights

### What worked well with IA?
- Gerou migrations com autoconferência e roteiros SQL que o PO só precisa colar no SQL Editor.
- Testes de tela em navegador real (Playwright + Edge) com escrita bloqueada, rodados contra o Supabase real sem gravar dados.
- A banca de 5 revisores separados achou o que os testes não achavam: segurança e organização das branches.

### Where IA could be improved?
- Escreveu tudo pela conta de uma pessoa, o que esconde a falta de participação do resto do time no histórico.
- Repetiu na documentação o que os insumos traziam (senha sugerida no README) sem tratar como segredo.
- Trabalhou em branches empilhadas sem conferir se a base delas ainda era a atual (US-011).

### New IA techniques to try?
- Rodar a banca de revisão como passo fixo antes de mover para Review, e não só no fim.
- Pedir à IA uma checagem do estado da `main` (manifesto, backlog, branches abertas) no início de cada sprint.

---

## 📈 Team Health Check

**Escala: 1 (😞) a 5 (😊)**

| Dimensão | Rating | Comentários |
|----------|--------|-------------|
| **Colaboração** | [EQUIPE] | Dados: 1 autor de commits para 6 responsáveis |
| **Autonomia** | [EQUIPE] | |
| **Clareza de requisitos** | [EQUIPE] | Dados: stories com critérios e BDD; nenhuma `[PRECISA CLARIFICAR]` aberta |
| **Ferramentas/Infraestrutura** | [EQUIPE] | Dados: acesso ao SQL Editor concentrado no PO (impedimento já citado no planejamento) |
| **Work-life balance** | [EQUIPE] | Dados: todo o trabalho num único dia |

---

## 🎓 Learnings & Knowledge Share

- **Técnicas aprendidas:** funções `security definer` com `search_path` fixo para dar ao admin só o necessário; privilégio por coluna somado ao RLS; roteiro SQL que se desfaz sozinho.
- **Documentação criada:** `docs/tasks/breakdown_US-014.md`, `breakdown_US-015.md`, `breakdown_US-011.md`, `breakdown_US-012.md`; `supabase/README.md` (como cadastrar o primeiro admin).
- **Pair programming insights:** [EQUIPE] as duplas do planejamento chegaram a trabalhar juntas?

---

## 📝 Notes & Additional Comments

- A retrospectiva estava prevista para 23/11, antes da Sprint 04, e não aconteceu. A Sprint 04 começou sem ela.
- O Marco 2 foi entregue em 11/11 com US-001 a US-010 (decisão do PO de 09/11).
- 2026-11-27: o PO aprovou o registro do DEBT-012 no backlog.

---

## 🔄 Continuação para Próxima Sprint

### Keep Doing
- Atacar a cadeia crítica no primeiro dia.
- Roteiro SQL com autoconferência para toda regra nova de banco.
- Responsável nomeado por item no planejamento.

### Stop Doing
- Deixar stories em Review sem data para a revisão.
- Reaproveitar ID de item não feito.
- Manter planejamento e retrospectiva em branch sem merge.

### Start Doing
- Revisão independente marcada no penúltimo dia útil.
- PR feito por quem foi nomeado para a story.
- Conferir o estado da `main` (manifesto, backlog, branches) no início de cada sprint.
