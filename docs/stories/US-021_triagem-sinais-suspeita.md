# User Story: [US-021] Triagem automatica: sinais de suspeita e reanalise de aprovados

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Media
**Story Points:** 3
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** administrador
**Eu quero** que cadastros suspeitos e edicoes arriscadas de profissionais aprovados sejam sinalizados
**Para que** nao aprovar nem manter no diretorio quem nao deveria

### Contexto Adicional

Complementa a US-016 (dividida no Modo Backlog para ficar abaixo de 8 pontos). Suspeito vai sempre para humano, nunca para recusa automatica.

- **Requisitos de origem:** BR14, BR18 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-016
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** WhatsApp ou telefone normalizado igual ao de outro profissional → `suspeito`, com o nome do outro profissional no detalhe do admin.
- [ ] **Criterio 2:** Descricao com link, e-mail, sequencia de 8+ digitos ou termo da lista de bloqueio (A07) → `suspeito`; "Rua 12, casa 3" nao dispara.
- [ ] **Criterio 3:** Profissional que ja foi recusado e reenviou → `suspeito` (BR17).
- [ ] **Criterio 4:** Profissional `aprovado` que edita o perfil e gera `pendencia` ou `suspeito` volta para `pendente` e some do diretorio; contratacoes ja aceitas continuam e podem ser concluidas (BR18).
- [ ] **Criterio 5:** A fila destaca os suspeitos e eles nunca entram na aprovacao em lote.
- [ ] **Criterio 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 7:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 8:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Regra de negocio com efeito em visibilidade publica (diretorio); BDD de revisao manual.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/004_triagem.sql, supabase/testes/004_triagem.sql, helpme-app/js/admin-analise.js, helpme-app/js/admin-profissional.js
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Na `004_triagem.sql`: sinais de suspeita em `solicitar_analise()` e mudanca para `pendente` de aprovado com alerta (a funcao e `security definer`, entao o trigger `validar_profissional` permite).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-016

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

- [ ] Dois profissionais com o mesmo WhatsApp → o segundo fica suspeito.
- [ ] Descricao com "www." → suspeito.
- [ ] Aprovado edita descricao com link → sai do diretorio; contratacao aceita dele ainda conclui.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Sinais de suspeita
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Volta para pendente de aprovado com alerta
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Destaque na fila e exclusao do lote
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Guardar na checagem o id do profissional com telefone repetido, para o admin comparar os dois perfis.

### Riscos Identificados

Falso positivo tira do diretorio um profissional legitimo; mensagem clara em `bloqueio.html` (US-013) reduz o impacto.

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
