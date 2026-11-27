# User Story: [US-023] Concluir só com valor aprovado e cancelar antes de aprovar

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 3
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente
**Eu quero** cancelar uma contratação aceita enquanto não aprovei o valor, e que o serviço só possa ser concluído com valor aprovado
**Para que** que ninguém conclua um serviço sem preço combinado e eu não fique preso a uma contratação cujo valor não aceito

### Contexto Adicional

Altera a BR06 (regras de status da contratação, trigger `validar_contratacao` da 001) pela BR23, em migration nova (DEBT-008). Hoje o cliente só cancela enquanto `solicitada`, e qualquer parte conclui uma contratação `aceita`. Há 1 contratação `aceita` sem orçamento no banco real: ela passa a precisar de valor aprovado para ser concluída.

- **Requisitos de origem:** BR23, FR31, NFR14 (`docs/requirements/helpme-marco3-orcamento-avaliacao.md`)
- **Discovery:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`
- **Dependências:** US-022

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** "Concluir serviço" só aparece (e só funciona) com valor aprovado; sem ele, a tela explica "Combine e aprove o valor antes de concluir".
- [ ] **Critério 2:** Pela API, `aceita → concluida` sem orçamento aprovado é recusado pelo banco com mensagem clara (BR23).
- [ ] **Critério 3:** O **cliente** vê "Cancelar contratação" na contratação `aceita` sem valor aprovado; o app pede confirmação; a contratação vai para `cancelada` e o profissional vê "Cancelada pelo cliente" (FR31).
- [ ] **Critério 4:** Pela API: o profissional não cancela uma contratação `aceita`; o cliente não cancela depois do valor aprovado (BR23).
- [ ] **Critério 5:** As transições antigas continuam iguais (aceitar, recusar, cancelar `solicitada`), conferidas no roteiro SQL.
- [ ] **Critério 6:** `contratacao_api.mjs` e `contratacao_telas.mjs` atualizados para a regra nova (concluir passa por orçamento aprovado) e passando (NFR14).
- [ ] **Critério 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 8:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 9:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

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
- **Touch List preliminar:** supabase/migrations/016_conclusao_com_orcamento.sql (novo; número confirmado no merge), supabase/testes/016_*.sql (novo), helpme-app/servico-andamento.html, helpme-app/js/telas/servico-andamento.js, supabase/testes/contratacao_api.mjs, supabase/testes/contratacao_telas.mjs
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `auth.css`, `contratacao.css`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST/RPC).
- **Database changes:** Migration nova, depois da US-022, substituindo `validar_contratacao` com as transições da BR23; sem editar a 001.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `014_privacidade_limites.sql`
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] US-022

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

- [ ] Sem valor aprovado → "Concluir" indisponível; com valor aprovado → conclui.
- [ ] Cliente cancela antes de aprovar → o profissional vê "Cancelada pelo cliente".
- [ ] Depois de aprovado → não há "Cancelar".
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Trigger com as transições da BR23 e roteiro SQL
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Botões Concluir e Cancelar na tela
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Atualizar os testes .mjs da contratação
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

- 2026-11-27: story gerada no Modo Backlog a partir de `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (REQUIREMENTS_READY), aprovada pelo PO.

---

## Definition of Done Checklist

- [ ] Código implementado conforme os critérios de aceitação
- [ ] Roteiro SQL com todas as linhas "ok" no banco real
- [ ] Code review por quem não escreveu o código
- [ ] Critérios comuns de mobile e acessibilidade verificados
- [ ] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovação do Product Owner
