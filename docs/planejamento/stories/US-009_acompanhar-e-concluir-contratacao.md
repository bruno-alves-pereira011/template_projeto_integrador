# User Story: [US-009] Acompanhar, cancelar e concluir contratacao

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
**Eu quero** acompanhar a contratacao em tempo real, ver o contato da outra parte depois do aceite e concluir o servico
**Para que** saber em que pe esta o servico e encerrar quando terminar

### Contexto Adicional

Nova pagina `contratacao.html?id=` (detalhe; o chat entra na US-010) e a visao do cliente em `contratacoes.html`. Substitui os stubs `espera-cliente.html` e `servico-andamento.html`.

- **Requisitos de origem:** FR11, FR13, BR06, BR07 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-008
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** O cliente ve em `contratacoes.html` a lista das proprias contratacoes com status atualizado em tempo real.
- [ ] **Criterio 2:** `contratacao.html` mostra profissional, descricao, endereco, data desejada e status, atualizando sem recarregar quando a outra parte muda o status.
- [ ] **Criterio 3:** Enquanto `solicitada`, o cliente pode cancelar (status `cancelada`).
- [ ] **Criterio 4:** Quando `aceita`, cada parte ve nome, telefone e WhatsApp da outra (botoes `tel:`/`wa.me` com a normalizacao da US-003); antes do aceite, o contato do cliente nao aparece para o profissional.
- [ ] **Criterio 5:** Quando `aceita`, qualquer das partes pode marcar como `concluida`; depois disso nao ha mais acoes.
- [ ] **Criterio 6:** Um terceiro usuario logado que abrir `contratacao.html?id=` de outra pessoa ve "Contratacao nao encontrada".
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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/contratacao.html (novo), template_projeto_integrador/helpme-app/js/contratacao.js (novo), template_projeto_integrador/helpme-app/contratacoes.html, template_projeto_integrador/helpme-app/js/contratacoes.js; remove stubs template_projeto_integrador/helpme-app/espera-cliente.html e template_projeto_integrador/helpme-app/servico-andamento.html
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

- [ ] US-008

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

- [ ] Fluxo completo com cliente e profissional em duas abas: solicitar → aceitar → concluir.
- [ ] Terceiro usuario tenta abrir o id → nao encontrado.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/contratacao.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Lista do cliente
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Pagina de detalhe com Realtime
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Acoes cancelar/concluir
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Exibicao de contato apos aceite
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-005]** Remover stubs
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Ler o contato da outra parte por uma funcao/consulta que respeite BR07 (definida no DEBT-003).

### Riscos Identificados

Corrida cancelar × aceitar: o trigger de transicao garante; o front so precisa tratar 0 linhas afetadas.

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
