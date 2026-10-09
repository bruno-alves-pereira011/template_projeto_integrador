# User Story: [US-003] Ver perfil e contatar profissional

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
**Eu quero** ver o perfil completo de um profissional e ligar ou chamar no WhatsApp com um toque
**Para que** combinar o servico de que preciso

### Contexto Adicional

Implementa HU02 e HU03. Nova pagina `profissional.html?id=<uuid>`. Fecha o primeiro vertical slice (home → lista → perfil → contato). O botao "Contratar" (US-007) sera adicionado depois nesta mesma pagina.

- **Requisitos de origem:** FR03, FR04, BR04, NFR02 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-002
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** A pagina exibe nome, descricao, cidade/bairro, categorias (com cor/sigla), media de notas e total de avaliacoes do profissional.
- [ ] **Criterio 2:** O botao "Ligar" usa `tel:<digitos>` e o botao "WhatsApp" usa `https://wa.me/55<DDD><numero>`, ambos com o numero normalizado (so digitos; remove `+55`/`55` duplicado).
- [ ] **Criterio 3:** Se o numero estiver ausente ou tiver menos de 10 digitos apos normalizar, o respectivo botao nao aparece.
- [ ] **Criterio 4:** `?id=` ausente, inexistente ou de profissional nao aprovado mostra "Profissional nao encontrado" com link para voltar.
- [ ] **Criterio 5:** Ha um link "Voltar" para a lista da categoria de origem.
- [ ] **Criterio 6:** Funciona sem login e le apenas da view `profissionais_publicos`.
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
- **Touch List preliminar:** template_projeto_integrador/helpme-app/profissional.html (novo), template_projeto_integrador/helpme-app/js/perfil-profissional.js (novo), template_projeto_integrador/helpme-app/js/telefone.js (novo, normalizacao reutilizavel)
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

- [ ] US-002

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

- [ ] No celular, tocar WhatsApp abre conversa com o numero do seed.
- [ ] Numero `(27) 99999-0000` e `+55 27 99999-0000` geram o mesmo link.
- [ ] `?id=` do profissional pendente → nao encontrado.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Pagina de perfil + consulta por id
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Funcao `normalizarTelefone` reutilizavel
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Botoes tel/WhatsApp com regras de exibicao
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Estados de erro
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Centralizar normalizacao em `js/telefone.js`, pois sera reusada em US-009 (contato da outra parte).

### Riscos Identificados

Numeros sem DDD no seed geram link invalido — validar o seed.

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
