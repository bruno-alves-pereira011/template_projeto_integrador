# User Story: [US-005] Completar e editar perfil do profissional

**Epic:** EPIC-003 Conta e acesso
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** 01
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** profissional
**Eu quero** completar e depois editar meu perfil com contatos, localizacao, descricao, data de nascimento e categorias
**Para que** aparecer no diretorio para os clientes quando for aprovado

### Contexto Adicional

Nova pagina `completar-perfil.html` (serve para criar e editar). Grava em `profissionais` e `profissional_categoria`. Idade 18+ validada no front e garantida pelo trigger do banco. O `status_aprovacao` e sempre `pendente` na criacao e o profissional nao consegue altera-lo (A02: editar nao gera nova analise).

- **Requisitos de origem:** FR06, BR01, BR02 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-004
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** O formulario tem WhatsApp, telefone, cidade, bairro, descricao, data de nascimento e as 6 categorias como checkboxes (vindas da tabela).
- [ ] **Criterio 2:** Nao e possivel salvar sem pelo menos uma categoria marcada nem com idade menor que 18 anos (mensagem no campo).
- [ ] **Criterio 3:** Ao salvar pela primeira vez, cria a linha em `profissionais` com status `pendente` e as linhas em `profissional_categoria`, e redireciona para `bloqueio.html`.
- [ ] **Criterio 4:** Ao editar, o formulario vem preenchido; desmarcar/marcar categorias atualiza `profissional_categoria`; o status de aprovacao nao muda.
- [ ] **Criterio 5:** Se o banco rejeitar (ex.: idade burlada no front), a mensagem de erro aparece e nada fica salvo pela metade.
- [ ] **Criterio 6:** A pagina exige sessao de profissional (`exigirSessao('profissional')`).
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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/completar-perfil.html (novo), template_projeto_integrador/helpme-app/js/completar-perfil.js (novo)
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

- [ ] Data de nascimento de 17 anos → bloqueado no front; via console → banco rejeita.
- [ ] Editar perfil aprovado → continua aprovado e aparece no diretorio com dados novos.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Formulario + carga de categorias
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Validacoes de idade e categorias
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Insert/update de perfil e categorias
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Modo edicao + link "Editar meu perfil"
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Gravar perfil primeiro e categorias depois; se as categorias falharem, mostrar erro e permitir reenviar (upsert idempotente).

### Riscos Identificados

Sem transacao no cliente: duas chamadas podem deixar perfil sem categorias; o upsert e a validacao no login (perfil sem categoria → completar-perfil) mitigam.

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
