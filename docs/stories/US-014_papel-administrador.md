# User Story: [US-014] Papel de administrador e area admin

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

**Como** administrador do HelpMe
**Eu quero** entrar pelo login normal e cair numa area exclusiva de administracao
**Para que** gerenciar o sistema sem depender do painel do Supabase

### Contexto Adicional

Base de seguranca do EPIC-006 (D6). O admin fica na tabela `administradores` (nao e um `tipo_usuario`, BR05 inalterada) e e criado so pelo SQL Editor. Primeira migration incremental (D7): `supabase/migrations/003_admin.sql`.

- **Requisitos de origem:** FR15, BR11, NFR08, NFR11 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** DEBT-004 (`main` estavel)
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `003_admin.sql` cria `administradores (usuario_id pk → usuarios)` com RLS ligado e a funcao `eh_admin()` (`security definer`, `stable`, `search_path` fixo); nenhuma politica permite ao app inserir/alterar/apagar linhas em `administradores`.
- [ ] **Criterio 2:** Usuario presente em `administradores` que faz login e levado para `admin.html` (pagina com menu: Painel, Fila de analise, Categorias, Sair), antes da regra de cliente/profissional.
- [ ] **Criterio 3:** Cliente ou profissional que abre `admin.html` (ou qualquer `admin*.html`) e redirecionado para a pagina inicial do proprio tipo; visitante vai ao login com `?voltar=`.
- [ ] **Criterio 4:** `signUp` com `tipo_usuario = 'admin'` nos metadados cria um cliente comum, sem acesso admin.
- [ ] **Criterio 5:** `validar_profissional` permite mudar `status_aprovacao` quando `eh_admin()` for verdadeiro e continua recusando a mudanca feita pelo proprio profissional pelo console.
- [ ] **Criterio 6:** Roteiro `supabase/testes/003_admin.sql` (NFR11) cobre os criterios 1, 4 e 5 e passa; `supabase/README.md` explica como cadastrar o primeiro admin (A09).
- [ ] **Criterio 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 8:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 9:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Toca autorizacao (novo papel com privilegio) e altera trigger de seguranca; cenarios BDD com revisao manual registram o comportamento.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/003_admin.sql (novo), supabase/testes/003_admin.sql (novo), supabase/README.md, helpme-app/js/sessao.js, helpme-app/admin.html (novo), helpme-app/js/admin.js (novo)
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Nova migration `003_admin.sql`: tabela `administradores`, funcao `eh_admin()`, ajuste em `validar_profissional`. Nao edita nem reaplica o `001` (D7).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] DEBT-004 (`main` estavel)

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

- [ ] Logar com o admin criado pelo SQL Editor → cai em `admin.html`.
- [ ] Logar como cliente e como profissional e abrir `admin.html` → redirecionados.
- [ ] Pelo console, como profissional pendente: `update profissionais set status_aprovacao='aprovado'` → erro.
- [ ] Executar `supabase/testes/003_admin.sql` no SQL Editor → todas as checagens OK.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Migration 003 (tabela, `eh_admin()`, trigger)
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Roteiro de testes de RLS 003
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Destino admin e `exigirSessao('admin')` em `sessao.js`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Casca `admin.html` com menu e Sair
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Em `sessao.js`, consultar `rpc('eh_admin')` uma vez no `destinoDoUsuario` e no `exigirSessao('admin')`; manter `calcularDestino` como funcao pura recebendo `ehAdmin`.

### Riscos Identificados

Erro em `eh_admin()` ou numa politica expoe dados de todos os usuarios; revisao por quem nao escreveu e obrigatoria.

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
