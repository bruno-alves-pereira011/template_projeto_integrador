# User Story: [US-012] Meu perfil do cliente

**Epic:** EPIC-007 Conta do cliente
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Media
**Story Points:** 2
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente
**Eu quero** editar meu nome e meu telefone
**Para que** que o profissional consiga falar comigo depois de aceitar minha contratacao

### Contexto Adicional

O telefone do cliente e opcional no cadastro (A01) e e o unico contato que o profissional recebe apos o aceite (BR07, `contato_contraparte`).

- **Requisitos de origem:** FR24 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** -
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `meu-perfil.html` (so cliente logado) mostra nome e telefone atuais e permite editar.
- [ ] **Criterio 2:** Telefone, se preenchido, precisa ter DDD + numero (mesma regra do cadastro); nome nao pode ficar vazio.
- [ ] **Criterio 3:** Salvar mostra confirmacao; o menu do cliente tem o link "Meu perfil".
- [ ] **Criterio 4:** O cliente nao consegue alterar `tipo_usuario` pelo console (trigger `proteger_usuario` existente).
- [ ] **Criterio 5:** Depois do aceite de uma contratacao, o profissional ve o telefone atualizado.
- [ ] **Criterio 6:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 7:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 8:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 0
- **Justificativa do nivel:** Edicao do proprio registro, ja coberta pelo RLS e trigger existentes.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** helpme-app/meu-perfil.html (novo), helpme-app/js/meu-perfil.js (novo), helpme-app/home-cliente.html (menu)
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Nenhuma (politica "usuarios: editar o proprio perfil" ja existe).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] -

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

- [ ] Editar telefone → recarregar → valor salvo.
- [ ] Telefone invalido → erro no campo.
- [ ] Profissional abre contratacao aceita → ve o telefone novo.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Pagina `meu-perfil.html`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Link no menu do cliente
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Reaproveitar `telefoneValido` (hoje dentro de `auth.js`) movendo para `js/telefone.js`.

### Riscos Identificados

Baixo.

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
