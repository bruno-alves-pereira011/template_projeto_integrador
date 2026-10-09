# User Story: [US-006] Tela de cadastro em analise

**Epic:** EPIC-003 Conta e acesso
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 2
**Sprint:** 01
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** profissional com cadastro pendente ou recusado
**Eu quero** ver claramente a situacao do meu cadastro
**Para que** entender por que ainda nao apareco no diretorio

### Contexto Adicional

Implementa o stub `bloqueio.html`. A aprovacao e manual pela equipe no Table Editor (D2).

- **Requisitos de origem:** FR08, BR03 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-004
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** Profissional `pendente` ve a mensagem "Seu cadastro esta em analise" e o link "Editar meu perfil".
- [ ] **Criterio 2:** Profissional `recusado` ve a mensagem de cadastro recusado com orientacao para contatar a equipe.
- [ ] **Criterio 3:** Ha botao "Sair" que encerra a sessao.
- [ ] **Criterio 4:** Um profissional aprovado que abrir `bloqueio.html` e redirecionado para `contratacoes.html`; cliente e redirecionado para a home.
- [ ] **Criterio 5:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 6:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 7:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/bloqueio.html, template_projeto_integrador/helpme-app/js/bloqueio.js (novo)
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST).
- **Database changes:** Nenhuma.
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-004

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

- [ ] Logar com o profissional pendente do seed → bloqueio.
- [ ] Aprovar no painel → logar de novo → contratacoes.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Implementar pagina e mensagens por status
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Redirecionamentos e Sair
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Reaproveitar `auth.css` para o layout centralizado.

### Riscos Identificados

Baixo.

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
