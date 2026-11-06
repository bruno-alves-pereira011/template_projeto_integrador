# User Story: [US-015] Fila de analise e aprovacao de profissionais

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** administrador
**Eu quero** ver a fila de cadastros em analise e aprovar ou recusar cada um, ou varios de uma vez
**Para que** liberar profissionais rapido e com registro de quem decidiu e por que

### Contexto Adicional

Substitui a aprovacao pelo Table Editor (D2 → D6). Funciona mesmo antes da triagem (US-016): sem triagem, a fila mostra "sem triagem" e a aprovacao em lote fica desabilitada.

- **Requisitos de origem:** FR17, FR18, FR19, BR15, BR16, BR19, NFR10 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-014
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `admin-analise.html` lista os profissionais `pendente` com nome, cidade/bairro, categorias, tempo na fila e resultado da ultima triagem (ou "sem triagem"); filtra por resultado.
- [ ] **Criterio 2:** `admin-profissional.html?id=` mostra os dados do perfil, as checagens da triagem (quando houver) e o historico de decisoes.
- [ ] **Criterio 3:** "Aprovar" muda o status para `aprovado` e o profissional passa a aparecer no diretorio; "Recusar" exige motivo de 10 a 500 caracteres (BR16).
- [ ] **Criterio 4:** Na fila, o admin seleciona varios profissionais com resultado verde e aprova todos de uma vez; os que nao estao `pendente` + verde no momento da acao sao ignorados e listados na tela (BR15).
- [ ] **Criterio 5:** Dois admins decidindo o mesmo profissional ao mesmo tempo: so a primeira acao vale; a segunda recebe aviso e a tela recarrega.
- [ ] **Criterio 6:** Toda aprovacao/recusa grava em `analises_profissional` o autor (admin), a acao, o motivo e a data; o historico nao pode ser alterado nem apagado pelo app (BR19, NFR10).
- [ ] **Criterio 7:** Cliente ou profissional chamando as funcoes de decisao pela API recebe erro de permissao (roteiro de testes atualizado).
- [ ] **Criterio 8:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 9:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 10:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Maquina de estados de aprovacao com controle de acesso; BDD de revisao manual.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/003_admin.sql (tabela `analises_profissional`, funcao de decisao individual/lote, politicas de leitura do admin), supabase/testes/003_admin.sql, helpme-app/admin-analise.html (novo), helpme-app/admin-profissional.html (novo), helpme-app/js/admin-analise.js (novo), helpme-app/js/admin-profissional.js (novo)
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Na `003_admin.sql`: tabela `analises_profissional` (profissional_id, resultado, checagens `jsonb`, acao, autor_id nulo = sistema, motivo, created_at) com RLS; funcao `decidir_profissionais(ids, acao, motivo)` `security definer` que confere `eh_admin()`, BR15 e BR16; politicas de SELECT para admin em `usuarios`, `profissionais`, `profissional_categoria`. Nunca em `mensagens` (BR21).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-014

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

- [ ] Cadastrar 2 profissionais de teste → aparecem na fila.
- [ ] Aprovar um → aparece em `profissionais.html` da categoria.
- [ ] Recusar outro sem motivo → bloqueado; com motivo → historico mostra admin, acao e motivo.
- [ ] Duas abas de admin aprovando/recusando o mesmo profissional → so a primeira vale.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Tabela `analises_profissional` + funcao de decisao
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Tela da fila com filtro e selecao em lote
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Tela de detalhe com historico e acoes
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Atualizar roteiro de testes 003
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

A decisao em lote deve ser uma unica chamada `rpc` que devolve quais ids foram aprovados e quais foram ignorados, para a tela informar o admin sem varias requisicoes.

### Riscos Identificados

Politicas de leitura do admin amplas demais; limitar as colunas necessarias e nunca liberar `mensagens`.

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
