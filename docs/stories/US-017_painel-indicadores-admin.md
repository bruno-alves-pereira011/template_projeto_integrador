# User Story: [US-017] Painel de indicadores do administrador

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Media
**Story Points:** 5
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** administrador
**Eu quero** ver indicadores do sistema numa unica tela
**Para que** acompanhar o HelpMe como um todo e agir onde ha problema

### Contexto Adicional

`admin.html` (casca criada na US-014) ganha os indicadores. Privacidade: a tela le so totais (NFR09).

- **Requisitos de origem:** FR16, NFR09 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-014
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `admin.html` mostra: usuarios por tipo; profissionais por status; tamanho da fila e tempo medio em analise; contratacoes por status nos ultimos 7 e 30 dias; taxa de aceite (aceitas ÷ respondidas); categorias ativas sem profissional aprovado.
- [ ] **Criterio 2:** Todos os numeros vem de uma unica chamada `rpc('painel_admin')`, que devolve so totais (sem linhas de usuarios).
- [ ] **Criterio 3:** Cliente ou profissional chamando `painel_admin()` recebe erro de permissao.
- [ ] **Criterio 4:** Cada indicador da fila e das categorias sem profissional leva para a tela correspondente (fila / categorias).
- [ ] **Criterio 5:** Sem dados (banco vazio) a tela mostra zeros, sem erro.
- [ ] **Criterio 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 7:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 8:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 0
- **Justificativa do nivel:** Leitura agregada sem regra de estado; seguranca coberta pela checagem de `eh_admin()` na funcao.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/003_admin.sql ou 005_painel.sql (funcao `painel_admin()`), helpme-app/admin.html, helpme-app/js/admin.js
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Funcao `painel_admin()` `security definer` que confere `eh_admin()` e devolve `json` com os totais.
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

- [ ] Comparar cada numero com uma consulta manual no SQL Editor.
- [ ] Chamar `painel_admin()` como cliente → erro.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Funcao `painel_admin()`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Cards de indicadores em `admin.html`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Cards simples com numero grande + rotulo; sem biblioteca de graficos (NFR03).

### Riscos Identificados

Consulta pesada se crescer; indices existentes cobrem o MVP.

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
