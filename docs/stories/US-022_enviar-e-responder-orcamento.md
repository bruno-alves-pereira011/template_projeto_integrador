# User Story: [US-022] Enviar e responder orçamento da contratação

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** -
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** profissional que aceitou uma contratação, e cliente que contratou
**Eu quero** que o profissional envie o valor do serviço e o cliente aprove ou recuse
**Para que** que o preço fique combinado e registrado no app antes de o serviço ser concluído

### Contexto Adicional

Hoje o preço é combinado fora do app (chat ou WhatsApp) e nada registra o valor aceito. O orçamento acontece **depois do aceite** (decisão do PO no C0). A contratação continua `aceita` durante o orçamento; a situação do valor vem de uma tabela própria (key decision do Requirements).

- **Requisitos de origem:** FR27, FR28, FR29, FR30, BR24, BR25, BR26, NFR12, NFR13 (`docs/requirements/helpme-marco3-orcamento-avaliacao.md`)
- **Discovery:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md`
- **Dependências:** nenhuma (base do EPIC-005)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** Em `servico-andamento.html`, com a contratação `aceita` e sem valor aguardando resposta nem aprovado, o **profissional** vê "Enviar orçamento", informa o valor em reais e uma observação opcional (até 200 caracteres) e envia.
- [ ] **Critério 2:** Valor vazio, zero, negativo, com letras, abaixo de R$ 1,00 ou acima de R$ 100.000,00 mostra erro no campo e nada é enviado; o banco também recusa (BR26). O valor é guardado em centavos inteiros e exibido como `R$ 1.234,50` (NFR12).
- [ ] **Critério 3:** O **cliente** vê "Valor proposto: R$ X" com a observação e os botões "Aprovar" e "Recusar"; a resposta vale uma vez só (duplo clique ou outra aba não respondem de novo).
- [ ] **Critério 4:** Depois de uma recusa, o profissional pode enviar novo valor, sem limite (FR29); depois de um aprovado, ninguém envia outro nem altera o aprovado (BR24).
- [ ] **Critério 5:** As duas partes veem o histórico da contratação: cada valor, observação, data de envio, resposta e data da resposta (FR30).
- [ ] **Critério 6:** Pela API: só o profissional da contratação envia; só o cliente dela responde; terceiros não leem os orçamentos; o admin não lê pela tabela; não existem dois valores aguardando ao mesmo tempo (BR24, BR25). Roteiro em `supabase/testes/` com todas as linhas "ok" (NFR13).
- [ ] **Critério 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 8:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 9:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

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
- **Touch List preliminar:** supabase/migrations/015_orcamentos.sql (novo), supabase/testes/015_orcamentos.sql (novo), helpme-app/servico-andamento.html, helpme-app/js/telas/servico-andamento.js, helpme-app/js/servicos/contratacao-comum.js (formatar reais), helpme-app/assets/css/contratacao.css, supabase/README.md
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `auth.css`, `contratacao.css`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST/RPC).
- **Database changes:** Migration `015_*`: tabela `orcamentos` (contratação, valor em centavos, observação, situação `aguardando`/`aprovado`/`recusado`, datas), RLS só das partes, insert só do profissional da contratação `aceita`, índice único parcial para um `aguardando` e um `aprovado` por contratação; função `responder_orcamento(id, aprovar)` `security definer` com `search_path` fixo.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql`, `014_privacidade_limites.sql`
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] nenhuma (base do EPIC-005)

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

- [ ] Profissional envia R$ 350,00 "Inclui material" → cliente vê e aprova → as duas telas mostram "Valor aprovado".
- [ ] Cliente recusa → profissional envia R$ 300,00 → o histórico mostra os dois.
- [ ] Valor "abc", 0 e 100.000,01 → erro no campo.
- [ ] Duplo clique em Enviar e em Aprovar → um envio só.
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Migration 015 e roteiro SQL
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Bloco de orçamento em servico-andamento (profissional e cliente)
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Histórico e formatação em reais
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
