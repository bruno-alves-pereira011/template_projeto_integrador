# User Story: [US-010] Chat em tempo real na contratacao

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

**Como** cliente ou profissional envolvido
**Eu quero** trocar mensagens de texto dentro da contratacao
**Para que** tirar duvidas e combinar detalhes sem sair do app

### Contexto Adicional

Adiciona o chat em `contratacao.html`, usando a tabela `mensagens` com Realtime. So as duas partes leem e escrevem; so enquanto a contratacao esta `solicitada` ou `aceita`.

- **Requisitos de origem:** FR14, BR08, NFR07 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-007 (US-009 para a pagina de detalhe)
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `contratacao.html` mostra o historico de mensagens em ordem cronologica, identificando quem enviou e o horario.
- [ ] **Criterio 2:** Enviar uma mensagem faz ela aparecer para a outra parte sem recarregar (Realtime).
- [ ] **Criterio 3:** Mensagem vazia ou com mais de 1000 caracteres nao e enviada (contador visivel).
- [ ] **Criterio 4:** Em contratacao `recusada`, `cancelada` ou `concluida`, o campo de envio fica desabilitado e o historico permanece visivel.
- [ ] **Criterio 5:** Conteudo e exibido com `textContent`: enviar `<b>oi</b>` mostra o texto literal.
- [ ] **Criterio 6:** Um terceiro usuario nao consegue ler nem inserir mensagens dessa contratacao (testado via console).
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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/contratacao.html, template_projeto_integrador/helpme-app/js/chat.js (novo), template_projeto_integrador/helpme-app/assets/css/dashboard.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST, Realtime).
- **Database changes:** Usa `mensagens` (DEBT-003).
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-007 (US-009 para a pagina de detalhe)

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

- [ ] Duas abas trocando mensagens.
- [ ] Concluir a contratacao → campo desabilita.
- [ ] Tentar insert via console com outro usuario → negado.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/contratacao.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** UI do chat (lista + campo + contador)
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Carga do historico e envio
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Assinatura Realtime filtrada por contratacao
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Bloqueio por status
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Assinar `postgres_changes` com `filter: contratacao_id=eq.<id>`; rolar para a ultima mensagem ao receber.

### Riscos Identificados

Spam/volume nao e tratado no MVP; limite de tamanho no banco e no front.

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
