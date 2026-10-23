# Sprint Planning - Sprint 01

**Data:** 2026-10-09
**Participantes:** Bruno Alves, Lucas dos Santos Felipe, Davi Souza, Luiz Felipe Moro, Welcson, Gabriel
**Sprint Duration:** 1 semana (2026-10-09 a 2026-10-16)
**Sprint Goal:** Qualquer visitante encontra um profissional aprovado por categoria e o chama no WhatsApp, com o app rodando contra o Supabase real.
**GitHub Project:** -
**GitHub Sprint Iteration:** -
**GitHub Sprint Milestone:** -

---

## Sprint Capacity

- **Velocity anterior:** N/A (primeira sprint)
- **Capacidade estimada:** 18 pontos planejados; 30 apos inclusao de US-004 a US-006 pelo PO (implementacao assistida por agentes)
- **Dias uteis disponiveis:** 5 (09, 13, 14, 15 e 16/10)
- **Impedimentos conhecidos:** feriado de 12/10 (Nossa Senhora Aparecida); aplicar SQL depende de alguem da equipe com acesso ao painel do Supabase.

---

## Sprint Goal

> Entregar o primeiro vertical slice do HelpMe: visitante abre a home → escolhe a categoria → ve a lista de profissionais aprovados → abre o perfil → liga ou chama no WhatsApp, tudo com dados reais do Supabase e protegido por RLS.

---

## User Stories Selecionadas

Ordem de execucao: DEBT-003 → US-001 → US-002 → US-003.

### [DEBT-003] Revisar e aplicar o schema no Supabase

- **Prioridade:** Alta (bloqueia todo o slice)
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 3
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 1
- **Exige Spec governada?** Nao
- **Spec:** -
- **Exige Contract governado?** Nao
- **Contract:** -
- **BDD:** `docs/bdd/contratacao.feature` (revisao manual — regras BR06–BR10 do banco)
- **Behavior change esperado:** YES
- **Criterios de Aceitacao:**
  - [ ] `001_schema.sql` troca `pedidos` por `contratacoes` (`profissional_id` obrigatorio, `data_desejada`, status `solicitada/aceita/recusada/cancelada/concluida`) com trigger de transicao (BR06), data nao passada (BR09) e so cliente contrata aprovado (BR10)
  - [ ] Tabela `mensagens` com RLS so das partes, bloqueio por status (BR08), limite de 1000 caracteres e Realtime
  - [ ] Contato da outra parte so apos aceite (BR07); view `profissionais_publicos` mantida
  - [ ] `seed.sql`, `supabase/README.md`, secao 8 do README e D5 em `docs/DECISOES.md` atualizados
  - [ ] Schema e seed aplicados no Supabase real pela equipe, com as consultas de verificacao do `supabase/README.md` passando

### [US-001] Ver categorias reais na home publica

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Nao
- **Spec:** -
- **Exige Contract governado?** Nao
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES
- **Criterios de Aceitacao:** ver `docs/stories/US-001_categorias-reais-na-home.md`
  - [ ] Home publica lista as 6 categorias vindas da tabela `categorias`
  - [ ] URL `.supabase.co` em arquivo unico; scripts padronizados; zero erros no console
  - [ ] `MODO_DEMONSTRACAO` centralizado e `false`; `CATEGORIAS` hard-coded removido

### [US-002] Listar profissionais aprovados por categoria

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Nao
- **Spec:** -
- **Exige Contract governado?** Nao
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES
- **Criterios de Aceitacao:** ver `docs/stories/US-002_listar-profissionais-por-categoria.md`
  - [ ] `profissionais.html?categoria=<slug>` lista so aprovados, via view `profissionais_publicos`
  - [ ] Filtro por cidade/bairro; estados vazio e "categoria nao encontrada"

### [US-003] Ver perfil e contatar profissional

- **Prioridade:** Alta
- **GitHub Epic Issue:** -
- **GitHub US Issue:** -
- **Story Points:** 5
- **Assignee:** a definir
- **Nivel ScrumAIDev:** 0
- **Exige Spec governada?** Nao
- **Spec:** -
- **Exige Contract governado?** Nao
- **Contract:** -
- **BDD:** -
- **Behavior change esperado:** YES
- **Criterios de Aceitacao:** ver `docs/stories/US-003_perfil-e-contato-do-profissional.md`
  - [ ] Perfil com dados, categorias e media de notas
  - [ ] Botoes `tel:` e `wa.me/55…` com numero normalizado; ocultos se numero invalido
  - [ ] Profissional inexistente ou nao aprovado → "nao encontrado"


### Escopo adicionado em 2026-10-09 (pedido do PO: "fluxo 1 e fluxo 2")

| ID | Titulo | Pts | Story |
|----|--------|-----|-------|
| US-004 | Cadastro e login com roteamento por tipo | 5 | `docs/stories/US-004_cadastro-e-login-com-roteamento.md` |
| US-005 | Completar e editar perfil do profissional | 5 | `docs/stories/US-005_completar-perfil-profissional.md` |
| US-006 | Tela de cadastro em analise | 2 | `docs/stories/US-006_tela-cadastro-em-analise.md` |

Todos Nivel 0, sem Spec/Contract/BDD. Com isso a sprint cobre o Fluxo 2 do Discovery (profissional se cadastra → em analise → aprovado → aparece no diretorio). Temporario ate a US-008: profissional aprovado e levado para `completar-perfil.html?aprovado=1`.

**Total comprometido:** 18 pontos (planejado) + 12 pontos (adicionados) = **30 pontos**.

---

## Rastreabilidade da Sprint

- **Backlog fonte:** `docs/product_backlog.md`
- **Requisitos:** `docs/requirements/helpme-mvp-marco2.md` (FR01–FR04, BR03, BR04, BR06–BR10 no banco, NFR01–NFR06)
- **TODO tecnico:** N/A
- **GitHub Sprint Container em uso:** - (publicacao no GitHub ainda nao feita)
- **Specs a criar/atualizar:** N/A
- **Contracts a criar/atualizar:** N/A
- **BDD a criar/atualizar:** `docs/bdd/contratacao.feature` (DEBT-003)
- **Gates opcionais da sprint:** N/A (sem runner de testes no projeto)
- **Task Issues a criar/atualizar:** N/A
- **Repositorio/branch de codigo:** `template_projeto_integrador/`, branch `feat/mvp-marco2` (commits `63fd8b0` Fase 0 e `051e324` Fase 1 ja feitos)

## Definition of Done

- [ ] Codigo revisado (code review por quem nao escreveu)
- [ ] Decisao sobre Spec governada registrada para cada US
- [ ] Decisao sobre Contract governado registrada para cada US
- [ ] Nivel ScrumAIDev registrado para cada US
- [ ] Specs, Contracts e BDD atualizados quando aplicavel
- [ ] Testes unitarios implementados — **dispensado** (sem runner; HTML/JS puro sem build, decisao da equipe); substituido por testes manuais documentados na story
- [ ] Testes de integracao, contract e BDD — **dispensados**; BDD com revisao manual
- [ ] Documentacao atualizada (README do projeto quando o modelo/fluxo mudar)
- [ ] Build em CI/CD — **N/A** (sem build)
- [ ] Deploy em staging — **N/A** no Marco 2; validacao via Live Preview contra o Supabase real
- [ ] Criterios comuns de mobile (360px) e acessibilidade basica verificados
- [ ] Validacao do Product Owner

---

## Riscos e Dependencias

| Risco/Dependencia | Impacto | Mitigacao |
|-------------------|---------|-----------|
| Schema nunca rodou no Supabase real (Auth, Realtime, permissoes padrao) | Alto | DEBT-003 primeiro, ate 13/10; roteiro de verificacao no `supabase/README.md`; ajustes rapidos no proprio 001 (banco pode ser recriado) |
| Acesso ao painel do Supabase concentrado em uma pessoa | Medio | Definir no inicio da sprint quem aplica o SQL e cria os usuarios de teste |
| Feriado de 12/10 reduz a semana para 5 dias uteis | Medio | Escopo conservador (18 pts); US-003 pode escorregar sem quebrar o goal parcial |
| US-001 mexe em todas as paginas (correcoes de base) | Medio | Commits pequenos por tipo de correcao; revisar o console em todas as paginas |
| Numeros de telefone do seed sem DDD | Baixo | Validar seed com numeros no formato `(27) 9XXXX-XXXX` |

---

## Notas e Decisoes

- Sprint de 1 semana para calibrar velocity; Sprint 02 deve focar EPIC-003 (conta e acesso).
- O slice nao depende de login: profissionais aprovados vem do `seed.sql`.
- `home-cliente.html` passa a ser publica com link "Entrar"; `index.html` continua sendo o login.
- Publicacao do planejamento no GitHub (`/scrumaidev-publish-github-planning`) pendente de decisao da equipe.
- Reserva de 20% da capacidade nao aplicada em pontos porque o escopo ja e conservador; o feriado e a reserva natural.

---

## Assistencia IA Utilizada

- [x] Refinamento de user stories
- [x] Estimativa de complexidade
- [x] Identificacao de riscos tecnicos
- [x] Sugestoes de arquitetura
- [ ] Definicao de Spec e Contract
- [x] Outros: Discovery/Requirements (scope-idea), schema SQL com RLS (Fase 1)

---

## Andamento (2026-10-09)

| Item | Commit (`feat/mvp-marco2`) | Status |
|------|----------------------------|--------|
| DEBT-003 | `a701e35` | Implementado; 116/116 testes em Postgres 17 local; **falta aplicar no Supabase real** |
| US-001 | `9f6f871` | Review |
| US-002, US-003 | `b7ef2fa` | Review |
| US-004, US-005, US-006 | `0fe1791` | Review |

Nenhuma story foi testada contra o Supabase real ainda. Para fechar como Done: aplicar `001_schema.sql` + criar usuarios de teste + `seed.sql`, executar os testes manuais de cada story e a checagem de mobile/acessibilidade.
