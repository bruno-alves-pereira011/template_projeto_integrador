# User Story: [US-007] Contratar profissional pelo perfil

**Epic:** EPIC-004 Contratacao no app
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** Sprint 02
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente
**Eu quero** contratar um profissional direto pelo perfil dele, informando o servico, o endereco e quando preciso
**Para que** formalizar o pedido sem depender so de ligacao

### Contexto Adicional

Adiciona o botao "Contratar" em `profissional.html` e a pagina `solicitar-pedido.html?profissional=<id>` (nome antigo mantido pela decisao D8). Cria a linha em `contratacoes` com status `solicitada`. A contratacao direta substitui o pedido aberto para a categoria (fluxo tipo Uber).

- **Requisitos de origem:** FR10, BR09, BR10 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-003, US-004, DEBT-003
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** O botao "Contratar" aparece no perfil para visitantes e clientes; nao aparece para profissionais logados.
- [ ] **Criterio 2:** Visitante sem login que clica em "Contratar" vai ao login e, apos entrar como cliente, volta para `solicitar-pedido.html` do mesmo profissional.
- [ ] **Criterio 3:** O formulario pede descricao (obrigatoria), endereco (obrigatorio) e data/horario desejado (obrigatorio, nao pode estar no passado).
- [ ] **Criterio 4:** Ao enviar, cria a contratacao com status `solicitada` e leva o cliente para `espera-cliente.html?id=<id>` (D8; ate a US-009, confirmacao na propria pagina).
- [ ] **Criterio 5:** O banco rejeita contratacao feita por profissional, para profissional nao aprovado ou com data no passado (testado via console).
- [ ] **Criterio 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 7:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 8:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Envolve maquina de estados e controle de acesso (BR06/BR08); cenarios BDD com revisao manual registram o comportamento.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` e no SQL versionado; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST) protegido por RLS, documentado em `template_projeto_integrador/supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/contratacao.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto)
- **Touch List preliminar:** template_projeto_integrador/helpme-app/profissional.html, template_projeto_integrador/helpme-app/solicitar-pedido.html (novo), template_projeto_integrador/helpme-app/js/solicitar-pedido.js (novo); remove stub template_projeto_integrador/helpme-app/solicitar-pedido.html
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST, Realtime).
- **Database changes:** Usa `contratacoes` (DEBT-003).
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-003, US-004, DEBT-003

### Consideracoes de Performance

- Consultas filtradas no banco (nao carregar tabelas inteiras); listas pequenas no MVP.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto — funcoes puras como normalizacao de telefone testadas manualmente no console)

### Testes de Integracao

- [ ] N/A

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Cliente do seed contrata profissional aprovado → status solicitada.
- [ ] Data de ontem → bloqueado.
- [ ] Visitante → login → volta ao formulario.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/contratacao.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Botao Contratar com regra de exibicao
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Pagina/formulario com validacoes
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Insert e redirecionamento
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Remover stub antigo
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

`datetime-local` com `min` = agora; converter para ISO com fuso antes de gravar (`timestamptz`).

### Riscos Identificados

Fuso horario: gravar como `timestamptz` e exibir com `toLocaleString('pt-BR')`.

### Alternativas Consideradas

Ver `docs/requirements/helpme-mvp-marco2.md` (Key Decisions) — alternativas descartadas: pedido aberto para a categoria, pagamento com gateway real.

---

## Notas e Comentarios

- 2026-10-09: story gerada no Modo Backlog a partir de `docs/requirements/helpme-mvp-marco2.md` (rev. 2), aprovada pelo usuario.
- 2026-10-23: implementada na branch `feat/US-007-contratar` (a partir de `developer`, com o DEBT-004). Breakdown em `docs/tasks/breakdown_US-007.md`. Ate a US-009, o envio mostra a confirmacao na propria `solicitar-pedido.html` em vez de ir para `contratacao.html?id=` (criterio 4).

---

## Definition of Done Checklist

- [ ] Codigo implementado conforme criterios de aceitacao
- [ ] Decisao sobre Spec governada foi registrada
- [ ] Decisao sobre Contract governado foi registrada
- [ ] Nivel ScrumAIDev foi registrado
- [ ] Spec, Contract e BDD foram atualizados quando aplicavel
- [ ] Gates opcionais executados ou dispensados com justificativa
- [ ] Error handling observavel segue o padrao compartilhado quando aplicavel
- [ ] Code review aprovado
- [ ] Testes unitarios com cobertura adequada (N/A — sem runner; dispensado)
- [ ] Testes de integracao e contract passando (N/A — dispensado)
- [ ] Documentacao atualizada
- [ ] Build/CI passando (N/A — sem build)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovacao do Product Owner
