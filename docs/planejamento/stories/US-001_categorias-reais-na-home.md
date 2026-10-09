# User Story: [US-001] Ver categorias reais na home publica

**Epic:** EPIC-001 Base funcional
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
**Eu quero** ver as categorias de servico reais na home, sem precisar de login
**Para que** escolher rapidamente o tipo de profissional de que preciso

### Contexto Adicional

Primeira story do slice inicial. Alem de FR01, carrega as correcoes de base que destravam todo o app: URL `.supabase.co`, `supabase-config.js` como fonte unica, padrao unico de carregamento de scripts, `MODO_DEMONSTRACAO` centralizado e desligado, categorias vindas da tabela `categorias` (remove `CATEGORIAS` duplicado em `cliente.js`/`profissional.js`). Decisao: `home-cliente.html` passa a ser publica, com link "Entrar"; `index.html` continua sendo o login; o Live Preview abre a home.

- **Requisitos de origem:** FR01, NFR01, NFR03, NFR06 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** DEBT-003 (schema revisado e aplicado no Supabase)
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `home-cliente.html` abre sem sessao e lista as 6 categorias lidas da tabela `categorias` (nome, sigla, cor, descricao).
- [ ] **Criterio 2:** Alterar o nome de uma categoria no Table Editor reflete na home apos recarregar (prova de que nao ha lista hard-coded).
- [ ] **Criterio 3:** A URL configurada e `https://btjjbtjxcbvswgezpwgc.supabase.co` e existe em um unico arquivo (`js/supabase-config.js`).
- [ ] **Criterio 4:** Todas as paginas carregam scripts na mesma ordem (CDN Supabase → `supabase-config.js` → script da pagina) e o console do navegador nao mostra erros em `index.html`, `cadastro.html` e `home-cliente.html`.
- [ ] **Criterio 5:** `MODO_DEMONSTRACAO` existe so em `supabase-config.js`, com valor `false`.
- [ ] **Criterio 6:** `index.html` nao tem o `+` antes do `<!DOCTYPE html>` e os comentarios de topo dos HTML batem com os ids reais.
- [ ] **Criterio 7:** A home mostra um link "Entrar" para `index.html`; se o Supabase falhar, mostra mensagem de erro amigavel em vez de lista vazia.
- [ ] **Criterio 8:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 9:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 10:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/js/supabase-config.js, template_projeto_integrador/helpme-app/js/auth.js, template_projeto_integrador/helpme-app/js/cliente.js, template_projeto_integrador/helpme-app/js/profissional.js, template_projeto_integrador/helpme-app/js/categorias.js (novo), template_projeto_integrador/helpme-app/*.html, template_projeto_integrador/.vscode/settings.json
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST).
- **Database changes:** Nenhuma (usa `categorias` criada no DEBT-003).
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] DEBT-003 (schema revisado e aplicado no Supabase)

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

- [ ] Abrir a home em aba anonima → ver 6 categorias.
- [ ] Renomear categoria no painel → recarregar → nome novo aparece.
- [ ] Abrir console em todas as paginas → zero erros de script.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Corrigir URL e centralizar config/modo demo
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Padronizar carregamento de scripts em todos os HTML
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Criar `js/categorias.js` (busca na tabela) e remover `CATEGORIAS` duplicado
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Tornar home publica + link Entrar + estado de erro
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-005]** Atualizar comentarios de topo e `.vscode/settings.json`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Escolher script classico (nao `type=module`) em todas as paginas: a equipe ja usa esse padrao e evita problemas de escopo no Live Preview. `supabase-config.js` expoe `window.supabaseClient` e `MODO_DEMONSTRACAO`.

### Riscos Identificados

Corrigir a base mexe em todas as paginas; fazer em commits pequenos para facilitar revisao.

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
