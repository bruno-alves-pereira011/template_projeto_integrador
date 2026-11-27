# User Story: [US-026] Avaliações no perfil público do profissional

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Média
**Story Points:** 3
**Sprint:** Sprint 05
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** visitante ou cliente
**Eu quero** ler as avaliações do profissional (nota, comentário, primeiro nome do autor e data)
**Para que** decidir quem contratar com base na experiência de outros clientes

### Contexto Adicional

O perfil já mostra média e total (FR03, view `profissionais_publicos`). O visitante não lê nomes de clientes em `usuarios` (migration 014), então o autor sai por função própria que devolve só o primeiro nome (NFR15).

- **Requisitos de origem:** FR35, NFR15, A11 (`docs/requirements/helpme-marco3-orcamento-avaliacao.md`)
- **Discovery:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`
- **Dependências:** nenhuma técnica; faz sentido depois da US-025

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** `profissional.html` lista até 20 avaliações, mais recentes primeiro: nota (estrelas com texto alternativo "Nota 4 de 5"), comentário, primeiro nome do autor e data (A11).
- [ ] **Critério 2:** Sem avaliações: "Este profissional ainda não foi avaliado."
- [ ] **Critério 3:** O primeiro nome vem de uma função `security definer` que só devolve avaliações de profissional aprovado e nenhum outro dado do cliente (id, telefone, sobrenome); o visitante continua sem ler `usuarios` de clientes (NFR15). Roteiro SQL confere.
- [ ] **Critério 4:** Comentário com HTML aparece como texto (`textContent`).
- [ ] **Critério 5:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 6:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 7:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

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
- **Touch List preliminar:** supabase/migrations/0NN_avaliacoes_publicas.sql (novo; pode ir junto da US-025), helpme-app/profissional.html, helpme-app/js/telas/perfil-profissional.js, CSS do perfil
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `auth.css`, `contratacao.css`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST/RPC).
- **Database changes:** Função pública `avaliacoes_do_profissional(p_id)` (`security definer`, `search_path` fixo, só aprovados, primeiro nome por `split_part`).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `014_privacidade_limites.sql`
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] nenhuma técnica; faz sentido depois da US-025

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

- [ ] Perfil com avaliações, sem avaliações e com comentário contendo `<b>`.
- [ ] Visitante tenta ler `usuarios` de cliente pela API → recusado.
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Função pública de avaliações e roteiro SQL
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Lista de avaliações no perfil
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

- 2026-11-27: PO aplicou a `019` e rodou o roteiro no banco real: **P1–P10 ok**. Pela API real, como visitante: a função devolve a avaliação 2 com autor "Ana" e só `nota`, `comentario`, `autor`, `criada_em`. Telas da contratação no banco real (`contratacao_telas.mjs`, que passa pelo perfil): **99/99**, sem regressão. Status: **Review**. Pendente: code review e PR. Observação fora do escopo (leitura direta de `avaliacoes` com `usuario_id`) registrada no breakdown, aguardando decisão do PO.
- 2026-11-27: implementada na branch `feat/US-026-avaliacoes-perfil` (decisões em `docs/tasks/breakdown_US-026.md`). Tela com visitante e banco simulados **19/19**. Falta o PO aplicar a `019_avaliacoes_publicas.sql` e rodar `supabase/testes/019_avaliacoes_publicas.sql` (P1–P10).
- 2026-11-27: story gerada no Modo Backlog a partir de `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (REQUIREMENTS_READY), aprovada pelo PO.

---

## Definition of Done Checklist

- [x] Código implementado conforme os critérios de aceitação
- [x] Roteiro SQL com todas as linhas "ok" no banco real
- [ ] Code review por quem não escreveu o código
- [x] Critérios comuns de mobile e acessibilidade verificados
- [x] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovação do Product Owner
