# User Story: [US-025] Avaliar o profissional depois do serviço

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 3
**Sprint:** Sprint 05
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente com uma contratação concluída
**Eu quero** dar uma nota de 1 a 5 ao profissional, com comentário opcional, e poder editar depois
**Para que** ajudar outros clientes a escolher e registrar como foi o serviço

### Contexto Adicional

HU04 do README. A tabela `avaliacoes` já existe (nota 1-5, comentário até 500, única por cliente e profissional). Hoje qualquer usuário logado avalia qualquer aprovado pela API (item 5 da banca de 2026-11-26): esta story fecha isso. Decisões do PO: só cliente com contratação concluída; editável; o autor não apaga; a avaliação do seed sem contratação é apagada.

- **Requisitos de origem:** FR33, FR34, BR27, BR28, BR29 (`docs/requirements/helpme-marco3-orcamento-avaliacao.md`)
- **Discovery:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`
- **Dependências:** nenhuma (usa contratações já concluídas)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** Na contratação `concluida` e em "Minhas contratações", o **cliente** vê "Avaliar profissional"; escolhe a nota (1 a 5, obrigatória) e escreve um comentário opcional (contador até 500).
- [ ] **Critério 2:** Depois de enviar, vê a própria avaliação e "Editar"; editar troca nota e comentário; não existe opção de apagar (BR28).
- [ ] **Critério 3:** Cliente com duas contratações concluídas com o mesmo profissional continua com uma avaliação só.
- [ ] **Critério 4:** Pela API: quem não tem contratação concluída com o profissional não cria nem edita avaliação; ninguém apaga avaliação; profissional e admin não alteram avaliação alheia (BR27, BR28).
- [ ] **Critério 5:** A migration apaga a avaliação do seed sem contratação concluída; depois dela, toda avaliação tem contratação concluída entre as partes (BR29). Roteiro SQL com todas as linhas "ok".
- [ ] **Critério 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 7:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 8:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** comportamento observável com regra no banco; sem API própria nem runner de contrato.
- **US exige Spec governada?** Não
- **Justificativa da Spec:** regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md`, versionadas em SQL.
- **Spec prevista:** N/A
- **US exige Contract governado?** Não
- **Justificativa do Contract:** o boundary é o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A (roteiro SQL + testes de tela)
- **Gates opcionais aplicaveis:** N/A; roteiro SQL em `supabase/testes/` (NFR13)
- **Touch List preliminar:** supabase/migrations/0NN_avaliacoes.sql (novo), supabase/testes/0NN_avaliacoes.sql (novo), helpme-app/servico-andamento.html (ou a tela da contratação concluída), helpme-app/js/telas/servico-andamento.js, helpme-app/js/telas/contratacoes.js, helpme-app/assets/css/contratacao.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `auth.css`, `contratacao.css`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST/RPC).
- **Database changes:** Migration nova: políticas `avaliacoes: autor cria` e `autor edita` exigem contratação `concluida` entre cliente e profissional; `autor apaga` removida; `delete` da avaliação do seed que não cumpre a regra.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `014_privacidade_limites.sql`
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] nenhuma (usa contratações já concluídas)

### Consideracoes de Performance

- Consultas filtradas no banco; listas pequenas no MVP.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] Roteiro SQL em `supabase/testes/` (desfaz tudo ao final) cobrindo as regras da story.

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Cliente avalia 5 com comentário → o perfil público atualiza média e total.
- [ ] Edita para 4 → a média muda.
- [ ] Sem nota → erro; comentário com 501 → o contador barra.
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Políticas de avaliações e limpeza do seed, com roteiro SQL
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Formulário de avaliação na contratação concluída
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Link "Avaliar" em Minhas contratações
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Regras no banco primeiro (migration + roteiro SQL), depois a tela; mesmo padrão das migrations 003 a 014.

### Riscos Identificados

Ver `docs/discovery/helpme-marco3-orcamento-avaliacao.md` (seção Risks).

### Alternativas Consideradas

Ver Key Decisions em `docs/requirements/helpme-marco3-orcamento-avaliacao.md`.

---

## Notas e Comentarios

- 2026-11-27: PO aplicou a `018` e rodou o roteiro no banco real: **A1–A16 ok**. Conferido só lendo: sobrou só a avaliação 2 (cliente@ → prof2, com contratação concluída); políticas `leitura publica`, `autor cria` e `autor edita` (sem `autor apaga`); sem permissão de apagar nem de mudar o profissional; visitante sem escrita; nada do roteiro ficou. Banco real com login: API **71/71** (US25-01..04, só recusas; a avaliação 2 continuou intacta) e telas **99/99** (sem regressão em Minhas contratações e no serviço em andamento). Status: **Review**. Pendente: code review e PR.
- 2026-11-27: implementada na branch `feat/US-025-avaliar-profissional` (decisões em `docs/tasks/breakdown_US-025.md`). Telas com sessão e banco simulados **33/33**; US-022 e US-023 na mesma tela sem regressão (23/23 cada). Falta o PO aplicar a `018_avaliacoes.sql` e rodar `supabase/testes/018_avaliacoes.sql` (A1–A16); depois, `contratacao_api.mjs` (US25-01..04, só recusas).
- 2026-11-27: story gerada no Modo Backlog a partir de `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (REQUIREMENTS_READY), aprovada pelo PO.

---

## Definition of Done Checklist

- [x] Código implementado conforme os critérios de aceitação
- [x] Roteiro SQL com todas as linhas "ok" no banco real
- [ ] Code review por quem não escreveu o código
- [ ] Critérios comuns de mobile e acessibilidade verificados
- [ ] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovação do Product Owner
