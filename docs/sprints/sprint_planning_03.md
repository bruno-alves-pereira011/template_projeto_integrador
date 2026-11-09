# Sprint Planning - Sprint 03

**Data:** 2026-11-09
**Participantes:** Bruno Alves (PO), Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel (a confirmar)
**Sprint Duration:** 1 semana (2026-11-12 a 2026-11-19) — primeira sprint do Marco 3
**Sprint Goal:** O administrador aprova ou recusa profissionais dentro do app, sem usar o Table Editor, e o cliente consegue recuperar a senha e manter o próprio perfil.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

**Status do planejamento:** APROVADO pelo PO em 2026-11-09 (escopo e responsáveis). Remarcada em 2026-11-09 para 12/11, depois da entrega do Marco 2 em 11/11.

---

## Sprint Capacity

- **Velocity anterior:** Sprint 02 — 16 pts implementados, 0 em Done dentro da sprint (`docs/retrospectives/sprint_02_retro.md`). Sprint 01 — 33 implementados, 0 em Done.
- **Capacidade estimada:** 16 pontos (mesma da Sprint 02, decisão da retrospectiva da Sprint 01)
- **Pontos planejados:** 16 (US-014 5 + US-015 5 + US-011 3 + US-012 2 + DEBT-009 1)
- **Dias úteis disponíveis:** 6 (12, 13, 16, 17, 18 e 19/11)
- **Impedimentos conhecidos:** acesso ao painel/SQL Editor do Supabase concentrado em uma pessoa; `refactor/ui-polish` (DEBT-005) sem decisão.

---

## Sprint Goal

> O administrador aprova ou recusa profissionais dentro do app (com histórico e sem Table Editor), e o cliente ganha "Esqueci minha senha" e "Meu perfil".

---

## Antes da sprint: fechamento e entrega do Marco 2 (10 e 11/11)

**Decisão do PO (2026-11-09):** o Marco 2 é entregue em **11/11** com o que existe: EPIC-001 a EPIC-004 (US-001 a US-010). EPIC-006 (admin) e EPIC-007 (conta do cliente) passam para o Marco 3. Não entra código novo de story nesses dois dias.

| Item | Pts | Responsável | Prazo |
|------|-----|-------------|-------|
| Limpar os dados de teste `[TESTE AUTO` (aparecem na lista do `prof1` durante a apresentação): `delete from public.contratacoes where descricao like '[TESTE AUTO%';` | 0 | Bruno Alves — **feito em 09/11** (0 restantes; seed, categorias e diretório conferidos) | 09/11 |
| Gate Done de US-009 e US-010 em `docs/tasks/testes_contratacao.md`: CH-13, CH-17, leitor de tela (CH-18), CH-20, CH-21 (code review cruzado) e CH-22 (PO). Os demais itens já passaram nos testes automatizados de 2026-11-09 | 0 | Bruno Alves, Luiz Felipe Moro e Welcson | 11/11 |
| Gate Done de US-007 e US-008 (itens CT/AC não automatizados, code review cruzado e validação do PO) | 0 | Lucas dos Santos Felipe, Davi Souza e Gabriel | 11/11 |
| DEBT-001 — README do projeto: rastreabilidade HU × tela × tabela (seção 9), contratação e chat no minimundo/HUs, "Como rodar o projeto" (incluindo `supabase/testes/`) | 2 | Luiz Felipe Moro | 11/11 |
| DEBT-002 — Revisão final por quem não escreveu o código: fluxos com os usuários do seed, tentativa de burlar o RLS e acessibilidade/mobile. Base pronta: `contratacao_api.mjs` (62 verificações) e `contratacao_telas.mjs` (93) rodados em 2026-11-09; falta a revisão humana e o registro | 2 | Lucas dos Santos Felipe | 11/11 |

---

## Pré-condições da sprint (não contam pontos)

| Item | Responsável | Prazo |
|------|-------------|-------|
| Confirmar que há um profissional `pendente` para testar BR10 (US7-02) e a fila da US-015: o `prof3@helpme.test` está `aprovado` no banco real; voltar para `pendente` ou criar outro | Bruno Alves — **feito em 09/11** (US7-02 passou) | 09/11 |
| Decidir `refactor/ui-polish` (DEBT-005): mesclar ou descartar antes de criar `admin*.html` | Bruno Alves (PO) + time | 12/11 |

---

## User Stories Selecionadas

Ordem de execução: DEBT-009 → US-014 → US-015; em paralelo (sem dependência): US-011 e US-012.

### [DEBT-009] Banco recusa descrição e endereço vazios em contratações

- **Prioridade:** Média
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 1
- **Assignee:** Bruno Alves
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES (só para chamadas diretas à API; o formulário já barra)
- **Origem:** achado US7-09 dos testes automatizados de 2026-11-09
- **Critérios de Aceitação:**
  - [ ] Migration incremental com o próximo número livre na ordem de aplicação (ex.: `004_contratacoes_campos_obrigatorios.sql` se o `003_admin.sql` da US-014 entrar antes; DEBT-008: não editar o `001`) com `check (char_length(trim(descricao)) between 1 and 1000)` e `check (char_length(trim(endereco)) between 1 and 200)`
  - [ ] Aplicada no Supabase real sem erro (limpar os dados `[TESTE AUTO` antes, ou usar `not valid` + `validate constraint`)
  - [ ] `node supabase/testes/contratacao_api.mjs`: US7-09 passa e nada mais quebra

### [US-014] Papel de administrador e área admin

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** Lucas dos Santos Felipe e Davi Souza
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-014_papel-administrador.md` (9 critérios). Resumo:
  - [ ] `003_admin.sql`: tabela `administradores` com RLS e `eh_admin()`; o app não insere/altera/apaga admins
  - [ ] Admin que faz login vai para `admin.html`; cliente/profissional é mandado embora; visitante vai ao login com `?voltar=`
  - [ ] `signUp` com `tipo_usuario = 'admin'` cria um cliente comum
  - [ ] `validar_profissional` aceita mudança de status feita por admin e continua recusando a do próprio profissional
  - [ ] `supabase/testes/003_admin.sql` cobre os critérios 1, 4 e 5; `supabase/README.md` explica como cadastrar o primeiro admin
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01

### [US-015] Fila de análise e aprovação (individual e em lote)

- **Prioridade:** Alta
- **GitHub Epic Issue:** - (EPIC-006)
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** Lucas dos Santos Felipe e Luiz Felipe Moro
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual)
- **Behavior change esperado:** YES
- **Dependência:** US-014
- **Critérios de Aceitação:** ver `docs/stories/US-015_fila-analise-aprovacao.md` (10 critérios). Resumo:
  - [ ] `admin-analise.html` lista os `pendente` (nome, local, categorias, tempo na fila, triagem ou "sem triagem") com filtro
  - [ ] `admin-profissional.html?id=` mostra perfil, checagens e histórico
  - [ ] Aprovar publica no diretório; Recusar exige motivo de 10 a 500 caracteres (BR16)
  - [ ] Aprovação em lote só dos `pendente` + verde; os ignorados são listados (BR15)
  - [ ] Dois admins ao mesmo tempo: só a primeira ação vale
  - [ ] `analises_profissional` grava autor, ação, motivo e data, sem alteração nem exclusão pelo app (BR19, NFR10)
  - [ ] Cliente/profissional chamando as funções de decisão recebe erro de permissão
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01
- **Observação:** sem a US-016 (triagem), toda a fila aparece como "sem triagem"; a aprovação em lote (critério 4) só pode ser testada de ponta a ponta na Sprint 04. Nesta sprint, testar que o lote ignora todos os "sem triagem" e lista os ignorados.

### [US-011] Esqueci minha senha

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-007)
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** Luiz Felipe Moro e Welcson
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-011_esqueci-minha-senha.md`. Resumo:
  - [ ] Link "Esqueci minha senha" em `index.html` leva a um formulário de e-mail
  - [ ] A resposta é sempre "Se este e-mail estiver cadastrado, enviamos um link" (BR22)
  - [ ] `redefinir-senha.html` pede a nova senha (6+) e a confirmação; ao salvar, leva ao login com sucesso
  - [ ] Link expirado/inválido: mensagem clara e opção de pedir outro; 429: mensagem de "muitas tentativas"
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01

### [US-012] Meu perfil do cliente (nome e telefone)

- **Prioridade:** Média
- **GitHub Epic Issue:** - (EPIC-007)
- **GitHub US Issue:** -
- **Story Points:** 2
- **Assignee:** Bruno Alves e Gabriel
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Não
- **Spec:** -
- **Exige Contract governado?** Não
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES
- **Critérios de Aceitação:** ver `docs/stories/US-012_meu-perfil-cliente.md`. Resumo:
  - [ ] `meu-perfil.html` (só cliente) mostra e edita nome e telefone; link "Meu perfil" no menu do cliente
  - [ ] Telefone com DDD + número (regra do cadastro); nome obrigatório; confirmação ao salvar
  - [ ] Cliente não altera `tipo_usuario` pelo console
  - [ ] Depois do aceite, o profissional vê o telefone atualizado (dá para reaproveitar `contratacao_api.mjs`, US9-08)
  - [ ] Critérios comuns: 360px, toque de 44px, acessibilidade e NFR01

---

## Carry-over (não consome capacidade)

| Item | Situação | O que falta |
|------|----------|-------------|
| US-007, US-008, US-009 (Sprint 02) | Review; testes automatizados OK em 2026-11-09 | Itens humanos do Gate Done (pré-condição acima) |
| US-010 (desenvolvida fora de sprint) | Review; testes automatizados OK em 2026-11-09 | Itens humanos do Gate Done, no fechamento do Marco 2 (10 e 11/11) |

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **TODO técnico:** N/A
- **GitHub Sprint Container em uso:** - (publicação no GitHub dispensada por decisão do PO em 2026-11-06; reavaliar)
- **Specs a criar/atualizar:** nenhuma (nível 0/1)
- **Contracts a criar/atualizar:** nenhum
- **BDD a criar/atualizar:** `docs/bdd/aprovacao_profissionais.feature` (US-014, US-015)
- **Gates opcionais da sprint:** N/A (sem runner de Contract/BDD). Testes automatizados disponíveis: `supabase/testes/*.mjs` e `*.sql`
- **Task Issues a criar/atualizar:** breakdowns em `docs/tasks/breakdown_US-014.md`, `breakdown_US-015.md`, `breakdown_US-011.md`, `breakdown_US-012.md` (via `/feature-development`)
- **Migrations novas:** `003_admin.sql` (US-014), DEBT-009 e US-015 (`analises_profissional`). **Regra:** cada migration recebe o próximo número livre no momento do merge, na ordem em que é aplicada no Supabase real; os números citados nas stories (ex.: `004_triagem.sql` da US-016) são indicativos e devem ser ajustados

## Definition of Done

- [ ] Código revisado por quem não escreveu (action item das Sprints 01 e 02)
- [ ] Decisão sobre Spec governada registrada para cada US
- [ ] Decisão sobre Contract governado registrada para cada US
- [ ] Nível ScrumAIDev registrado para cada US
- [ ] Specs, Contracts e BDD atualizados quando aplicável
- [ ] Testes unitários — **dispensado** (sem runner); substituído por scripts em `supabase/testes/` e roteiro manual na story
- [ ] Testes de integração, contract e BDD — **dispensados**; BDD com revisão manual
- [ ] **Roteiro de testes com Gate Review e Gate Done escrito ANTES da implementação** (proposta da retrospectiva da Sprint 02) e executado no Supabase real dentro da sprint
- [ ] Regra nova de RLS/trigger ganha script em `supabase/testes/` (proposta da retrospectiva da Sprint 02)
- [ ] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] Build em CI/CD — **N/A** (sem build)
- [ ] Deploy em staging — **N/A**; validação contra o Supabase real
- [ ] Critérios comuns de mobile (360px) e acessibilidade verificados
- [ ] Validação do Product Owner

---

## Riscos e Dependências

| Risco/Dependência | Impacto | Mitigação |
|-------------------|---------|-----------|
| Terceira sprint seguida sem Done (0 pts nas Sprints 01 e 02) | Alto | Gate Done de US-007 a US-010 no fechamento do Marco 2; meta de 70% dos pontos em Done dentro da sprint |
| Gate Done, README e revisão final em só 2 dias (10 e 11/11) | Alto | Nenhuma story nova antes de 12/11; os testes automatizados já cobrem a maior parte; o que não fechar até 11/11 entra na entrega como pendência declarada |
| US-015 depende da US-014 (cadeia de 10 pts numa semana) | Alto | US-014 começa no primeiro dia; US-011 e US-012 em paralelo, com outras pessoas |
| Sem profissional `pendente` no banco real (prof3 está aprovado) | Médio | Pré-condição: voltar o prof3 para `pendente` ou criar outro |
| `admin*.html` em conflito com `refactor/ui-polish` | Médio | Decidir o DEBT-005 antes de criar as telas |
| Criar o primeiro admin depende do SQL Editor (A09) | Médio | Documentar no `supabase/README.md` (US-014, critério 6) e cadastrar no início da sprint |
| US-011 depende de e-mail do Supabase Auth (link de redefinição, `redirectTo`) e do limite de envio do plano gratuito | Médio | Configurar a URL de redirecionamento no painel; testar com conta real e registrar o 429 |
| Aprovação em lote (US-015 c4) depende da triagem verde da US-016 | Baixo | Testar nesta sprint só o caminho "ignora sem triagem"; o caminho verde fica para a Sprint 04 |
| DEBT-009 falha ao aplicar por causa de dados de teste já gravados | Baixo | Limpar `[TESTE AUTO` antes (pré-condição) ou usar `not valid` |
| Trabalho concentrado em uma pessoa (Sprint 02: 1 autor de commits) | Alto | Responsável por item, com no máximo metade dos pontos por pessoa |
| Lucas está nas duas stories da cadeia crítica (US-014 → US-015, 10 pts) | Médio | Davi conduz a US-014 com Lucas; Luiz entra na US-015 já com o contexto da US-014; se a US-014 atrasar, Lucas avisa no daily |
| Bruno é autor dos commits de US-009 e US-010 e está no grupo que testa essas stories; o Gate Done pede testes e code review por quem não escreveu o código | Médio | Bruno fica com a validação do PO (CH-22); Luiz e Welcson executam os testes e o code review cruzado (CH-13, CH-21) |

---

## Notas e Decisões

- **2026-11-09 — escopo:** PO escolheu "Admin + EPIC-007": US-014, US-015, US-011, US-012 e DEBT-009 (16 pts). US-013 sai do roadmap da Sprint 03 e vai para a Sprint 04 (depende da US-015).
- **2026-11-09 — período:** 1 semana, de 10/11 a 17/11.
- **2026-11-09 — Gate Done do carry-over:** Bruno, Luiz e Welcson ficam com US-009 e US-010; Lucas, Davi e Gabriel com US-007 e US-008 (decisão do PO).
- **2026-11-09 — aprovação:** escopo aprovado pelo PO no Review & Adjust.
- **2026-11-09 — responsáveis:** DEBT-009 Bruno; US-014 Lucas e Davi; US-015 Lucas e Luiz; US-011 Luiz e Welcson; US-012 Bruno e Gabriel. Carga dividida por dupla: Lucas ~5 pts, Luiz ~4, Davi ~2,5, Bruno ~2, Welcson ~1,5, Gabriel ~1 (ninguém passa da metade dos 16 pts).
- **2026-11-09 — DEBT-009** criado a partir do achado US7-09 dos testes automatizados.
- **2026-11-09 — fechamento do Marco 2:** DEBT-001 com Luiz; DEBT-002 com Lucas (não é autor do código revisado).
- **2026-11-09 — Marco 2 em 11/11:** PO informou a data de entrega. Decisão: fechar o Marco 2 com US-001 a US-010 + DEBT-001 + DEBT-002; a Sprint 03 passa para 12/11 a 19/11 (Marco 3), com o mesmo escopo e os mesmos responsáveis.
- **Prévia da Sprint 04:** ver `docs/sprints/sprint_planning_04.md` (rascunho, 23/11 a 30/11).
- **Action items da retrospectiva da Sprint 02** atendidos aqui: responsável por item (pendente da resposta do PO), Gate Done de US-007 a US-010 como pré-condição e decisão do `refactor/ui-polish`.

---

## Assistência IA Utilizada

- [x] Refinamento de user stories (resumo dos critérios e observação sobre o lote da US-015)
- [x] Estimativa de complexidade (DEBT-009)
- [x] Identificação de riscos técnicos
- [ ] Sugestões de arquitetura
- [ ] Definição de Spec e Contract
- [x] Outros: análise de capacidade das Sprints 03 e 04, e testes automatizados de US-007 a US-010 usados como base do Gate Done
