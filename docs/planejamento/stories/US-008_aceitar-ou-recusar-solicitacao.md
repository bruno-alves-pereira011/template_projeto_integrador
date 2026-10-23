# User Story: [US-008] Aceitar ou recusar solicitacao recebida

**Epic:** EPIC-004 Contratacao no app
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** profissional aprovado
**Eu quero** ver as solicitacoes de contratacao que recebi e aceitar ou recusar cada uma
**Para que** organizar minha agenda e so assumir o que consigo atender

### Contexto Adicional

Nova pagina `contratacoes.html`, que para o profissional lista as contratacoes recebidas (substitui `feed-profissional.html`). Atualizacao em tempo real via Realtime em `contratacoes`.

- **Requisitos de origem:** FR12, BR06 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-005, US-007
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `contratacoes.html` (profissional) lista as contratacoes recebidas agrupadas por status, com descricao, bairro/endereco resumido e data desejada.
- [ ] **Criterio 2:** Em contratacao `solicitada`, os botoes "Aceitar" e "Recusar" mudam o status para `aceita` ou `recusada`.
- [ ] **Criterio 3:** Uma nova solicitacao aparece na lista sem recarregar a pagina (Realtime).
- [ ] **Criterio 4:** Se o cliente cancelou antes do aceite, a acao falha com aviso "Esta solicitacao foi cancelada" e a lista recarrega.
- [ ] **Criterio 5:** O profissional nao consegue (via console) aceitar contratacao de outro profissional nem pular estados.
- [ ] **Criterio 6:** Ha link "Editar meu perfil" (A03).
- [ ] **Criterio 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 8:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 9:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Envolve maquina de estados e controle de acesso (BR06/BR08); cenarios BDD com revisao manual registram o comportamento.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` e no SQL versionado; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST) protegido por RLS, documentado em `template_projeto_integrador/supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/contratacao.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto)
- **Touch List preliminar:** template_projeto_integrador/helpme-app/contratacoes.html (novo), template_projeto_integrador/helpme-app/js/contratacoes.js (novo); remove template_projeto_integrador/helpme-app/feed-profissional.html e template_projeto_integrador/helpme-app/js/profissional.js
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST, Realtime).
- **Database changes:** Nenhuma alem do DEBT-003.
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-005, US-007

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

- [ ] Duas abas: cliente contrata → aparece na aba do profissional sem recarregar.
- [ ] Cliente cancela e profissional tenta aceitar → aviso.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/contratacao.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Lista do profissional com agrupamento por status
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Acoes aceitar/recusar com `.eq('status','solicitada')`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Assinatura Realtime
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Remover feed antigo
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Manter o padrao bom do codigo antigo: update condicionado ao status atual (`.eq('status','solicitada')`) e checar linhas afetadas.

### Riscos Identificados

Realtime com RLS exige `pedidos`/`contratacoes` na publicacao e politicas de select corretas.

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
