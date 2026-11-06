# User Story: [US-013] Motivo da pendencia/recusa e reenvio para analise

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 3
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** profissional em analise ou recusado
**Eu quero** ver o motivo da minha situacao e reenviar meu cadastro depois de corrigir
**Para que** resolver sozinho, sem precisar falar com a equipe

### Contexto Adicional

Hoje `bloqueio.html` mostra so "entre em contato com a equipe". Com a US-015 passa a existir motivo de recusa; com a US-016, pendencias da triagem.

- **Requisitos de origem:** FR21, BR17 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-015 (motivo de recusa); US-016 enriquece com as pendencias
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** Profissional recusado ve em `bloqueio.html` o motivo informado pelo admin na ultima recusa (lido com `textContent`).
- [ ] **Criterio 2:** Profissional pendente ve "em analise" e, quando houver triagem (US-016), a lista de pendencias que ele mesmo precisa corrigir.
- [ ] **Criterio 3:** Ha link "Corrigir meu perfil" para `completar-perfil.html`.
- [ ] **Criterio 4:** Profissional recusado tem o botao "Reenviar para analise": o status volta para `pendente`, o reenvio fica no historico e o profissional continua em `bloqueio.html` (BR17).
- [ ] **Criterio 5:** O profissional so le as proprias analises; nao le as de outros nem os campos internos do admin (roteiro de testes atualizado).
- [ ] **Criterio 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 7:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 8:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Muda estado de aprovacao a partir do app (reenvio) e expoe dado de decisao ao proprio dono.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/003_admin.sql (politica de leitura do dono em `analises_profissional`, funcao `reenviar_para_analise()`), helpme-app/bloqueio.html, helpme-app/js/bloqueio.js
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Na `003_admin.sql`: SELECT do dono nas proprias linhas de `analises_profissional`; funcao `reenviar_para_analise()` `security definer` que so age se o chamador for profissional `recusado`.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-015 (motivo de recusa); US-016 enriquece com as pendencias

### Consideracoes de Performance

- Consultas filtradas no banco (nao carregar tabelas inteiras); listas pequenas no MVP.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] N/A

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Admin recusa com motivo → profissional loga e ve o motivo.
- [ ] Profissional clica "Reenviar" → status `pendente`; aparece de novo na fila do admin.
- [ ] Profissional pendente tenta chamar `reenviar_para_analise()` pelo console → nada muda.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Politica de leitura do dono e funcao de reenvio
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Exibir motivo/pendencias em `bloqueio.html`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Botao de reenvio
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Ler so a ultima analise (`order by created_at desc limit 1`).

### Riscos Identificados

Texto do motivo escrito pelo admin exibido ao profissional: sempre `textContent`.

### Alternativas Consideradas

Ver `docs/requirements/helpme-mvp-marco2.md` (rev. 3) (Key Decisions) e `docs/discovery/helpme-mvp-marco2.md` (rev. 3) — descartados: coleta de CPF/documento, APIs externas de verificacao, aprovacao automatica total, admin como `tipo_usuario`.

---

## Notas e Comentarios

- 2026-10-16: story gerada no Modo Backlog a partir de `docs/requirements/helpme-mvp-marco2.md` (rev. 3), aprovada pelo usuario.

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
