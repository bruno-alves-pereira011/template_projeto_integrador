# User Story: [US-016] Triagem automatica: checagens obrigatorias

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
**Eu quero** que cada cadastro chegue a fila ja checado como verde ou com pendencia
**Para que** so abrir os casos que realmente precisam de mim

### Contexto Adicional

Nivel A da proposta (D6): regras no banco, sem dependencia nova. A triagem so classifica, nunca aprova nem recusa (BR12). Sinais de suspeita ficam na US-021. Migration `004_triagem.sql`.

- **Requisitos de origem:** FR20, BR12, BR13 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-015
- **Repositorio de codigo:** raiz deste repositorio (branch de trabalho a partir de `main`, depois do DEBT-004)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `004_triagem.sql` cria `solicitar_analise()` (`security definer`), que grava em `analises_profissional` o resultado (`verde` ou `pendencia`) e cada checagem em `checagens` (`jsonb`).
- [ ] **Criterio 2:** `completar-perfil.js` chama `solicitar_analise()` ao final do salvamento (depois de gravar as categorias), na criacao e na edicao.
- [ ] **Criterio 3:** Checagens da BR13: e-mail confirmado (passa sempre se a confirmacao estiver desligada — A06); 18+; cidade e bairro preenchidos; descricao com 30+ caracteres; 1+ categoria ativa; WhatsApp ou telefone com DDD brasileiro valido e 10–11 digitos.
- [ ] **Criterio 4:** Todas passando → `verde`; qualquer falha → `pendencia` com o motivo legivel de cada falha (ex.: "Descricao com menos de 30 caracteres").
- [ ] **Criterio 5:** A fila (US-015) mostra o resultado e habilita a aprovacao em lote dos verdes.
- [ ] **Criterio 6:** O profissional nao consegue gravar um resultado `verde` pelo console (a tabela nao aceita insert do app; so a funcao grava) — roteiro `supabase/testes/004_triagem.sql`.
- [ ] **Criterio 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 8:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 9:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** Regra de negocio observavel e controle de acesso no banco; BDD de revisao manual.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` (rev. 3) e serao versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (revisao manual)
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto); roteiro SQL manual em `supabase/testes/` quando a story mexe no banco (NFR11)
- **Touch List preliminar:** supabase/migrations/004_triagem.sql (novo), supabase/testes/004_triagem.sql (novo), helpme-app/js/completar-perfil.js
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`); conferir antes o resultado do DEBT-005 (`refactor/ui-polish`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST/RPC).
- **Database changes:** Nova migration `004_triagem.sql`: funcao `solicitar_analise()` e funcoes auxiliares de validacao (DDD, telefone). Le `auth.users.email_confirmed_at`.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_privacidade_data_nascimento.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-015

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

- [ ] Perfil completo e correto → fila mostra verde.
- [ ] Descricao curta → pendencia com o motivo; corrigir e salvar → verde.
- [ ] Telefone com DDD 00 → pendencia.
- [ ] Executar `supabase/testes/004_triagem.sql` → OK.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Funcao `solicitar_analise()` e checagens
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Chamada no `completar-perfil.js`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Roteiro de testes 004
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Uma funcao por checagem retornando `(ok, motivo)` deixa a regra explicavel na apresentacao e facil de testar no SQL Editor.

### Riscos Identificados

Falso negativo em telefone (formatos variados): normalizar com a mesma regra de `js/telefone.js`.

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
