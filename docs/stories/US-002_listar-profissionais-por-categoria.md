# User Story: [US-002] Listar profissionais aprovados por categoria

**Epic:** EPIC-002 Diretorio e contato (HU01–HU03)
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** 01
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** visitante
**Eu quero** ver a lista de profissionais aprovados de uma categoria, podendo filtrar por cidade ou bairro
**Para que** encontrar alguem que atenda perto de mim

### Contexto Adicional

Implementa HU01. Nova pagina `profissionais.html?categoria=<slug>`, aberta ao clicar numa categoria da home. Le da view `profissionais_publicos` (NFR02), que so contem aprovados e nao expoe `data_nascimento`.

- **Requisitos de origem:** FR02, BR03, NFR02, NFR04 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-001
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** Clicar numa categoria na home abre `profissionais.html?categoria=<slug>` com o nome da categoria no titulo.
- [ ] **Criterio 2:** A lista mostra somente profissionais com `status_aprovacao = 'aprovado'` que atuam na categoria (o profissional pendente do seed nao aparece).
- [ ] **Criterio 3:** Cada card exibe nome, cidade/bairro e media de notas (ou "Sem avaliacoes") e leva para `profissional.html?id=<id>`.
- [ ] **Criterio 4:** Os campos de filtro por cidade e bairro reduzem a lista por texto (sem diferenciar maiusculas/minusculas).
- [ ] **Criterio 5:** Categoria sem profissionais aprovados mostra mensagem de estado vazio; slug inexistente mostra "Categoria nao encontrada" com link para a home.
- [ ] **Criterio 6:** A pagina funciona sem login e a consulta usa a view `profissionais_publicos`, nao a tabela `profissionais`.
- [ ] **Criterio 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 8:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 9:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 0
- **Justificativa do nivel:** Story de tela/fluxo sem regra de estado critica; rastreabilidade via requisitos basta.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` e no SQL versionado; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST) protegido por RLS, documentado em `template_projeto_integrador/supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto)
- **Touch List preliminar:** template_projeto_integrador/helpme-app/profissionais.html (novo), template_projeto_integrador/helpme-app/js/profissionais.js (novo), template_projeto_integrador/helpme-app/home-cliente.html, template_projeto_integrador/helpme-app/assets/css/dashboard.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST).
- **Database changes:** Nenhuma (view `profissionais_publicos`).
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-001

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

- [ ] Seed: Encanador lista o profissional aprovado; categoria do pendente nao o mostra.
- [ ] Filtrar por bairro inexistente → estado vazio.
- [ ] `?categoria=xyz` → mensagem de nao encontrada.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Criar pagina e template de card
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Consulta na view com filtro por categoria
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Filtro por cidade/bairro
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Estados vazio/erro/nao encontrada
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Filtrar por categoria com `.contains('categorias', [slug])` na view (coluna array de slugs). Filtro de texto pode ser no cliente (lista pequena) ou `.ilike`.

### Riscos Identificados

Se a view nao tiver as colunas esperadas apos o DEBT-003, ajustar a view antes de codificar.

### Alternativas Consideradas

Ver `docs/requirements/helpme-mvp-marco2.md` (Key Decisions) — alternativas descartadas: pedido aberto para a categoria, pagamento com gateway real.

---

## Notas e Comentarios

- 2026-10-09: story gerada no Modo Backlog a partir de `docs/requirements/helpme-mvp-marco2.md` (rev. 2), aprovada pelo usuario.

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
