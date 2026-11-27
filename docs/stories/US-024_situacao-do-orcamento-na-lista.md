# User Story: [US-024] Situação do orçamento em Minhas contratações

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Média
**Story Points:** 2
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente ou profissional
**Eu quero** ver na lista de contratações se a contratação aceita está aguardando valor, aguardando resposta ou com valor aprovado
**Para que** saber o que preciso fazer sem abrir cada contratação

### Contexto Adicional

Só front, sobre a tabela da US-022 (leitura permitida às partes).

- **Requisitos de origem:** FR32 (`docs/requirements/helpme-marco3-orcamento-avaliacao.md`)
- **Discovery:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`
- **Dependências:** US-022

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** Para o **cliente**, cada contratação `aceita` mostra "Aguardando valor do profissional", "Valor para aprovar: R$ X" ou "Valor aprovado: R$ X".
- [ ] **Critério 2:** Para o **profissional**, mostra "Enviar orçamento", "Aguardando o cliente (R$ X)", "Valor recusado — envie outro" ou "Valor aprovado: R$ X".
- [ ] **Critério 3:** A lista faz no máximo uma consulta extra para todos os orçamentos (não uma por cartão).
- [ ] **Critério 4:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 5:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 6:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** comportamento observável com regra no banco; sem API própria nem runner de contrato.
- **US exige Spec governada?** Não
- **Justificativa da Spec:** regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md`, versionadas em SQL.
- **Spec prevista:** N/A
- **US exige Contract governado?** Não
- **Justificativa do Contract:** o boundary é o Supabase (PostgREST/RPC) protegido por RLS, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A (roteiro SQL + testes de tela)
- **Gates opcionais aplicaveis:** N/A; roteiro SQL em `supabase/testes/` (NFR13)
- **Touch List preliminar:** helpme-app/contratacoes.html, helpme-app/js/telas/contratacoes.js, helpme-app/assets/css/contratacao.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `auth.css`, `contratacao.css`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST/RPC).
- **Database changes:** Nenhuma (lê a tabela da US-022).
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `014_privacidade_limites.sql`
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] US-022

### Consideracoes de Performance

- Consultas filtradas no banco; listas pequenas no MVP.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] Roteiro SQL em `supabase/testes/` (desfaz tudo ao final) cobrindo as regras da story.

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Lista com contratações em cada situação, como cliente e como profissional.
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Ler os orçamentos das contratações aceitas numa consulta só
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Selo de situação nos cartões
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Regras no banco primeiro (migration + roteiro SQL), depois a tela; mesmo padrão das migrations 003 a 014.

### Riscos Identificados

Ver `docs/discovery/helpme-marco3-orcamento-avaliacao.md` (seção Risks).

### Alternativas Consideradas

Ver Key Decisions em `docs/requirements/helpme-marco3-orcamento-avaliacao.md`.

---

## Notas e Comentarios

- 2026-11-27: story gerada no Modo Backlog a partir de `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (REQUIREMENTS_READY), aprovada pelo PO.

---

## Definition of Done Checklist

- [ ] Código implementado conforme os critérios de aceitação
- [ ] Roteiro SQL com todas as linhas "ok" no banco real
- [ ] Code review por quem não escreveu o código
- [ ] Critérios comuns de mobile e acessibilidade verificados
- [ ] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovação do Product Owner
