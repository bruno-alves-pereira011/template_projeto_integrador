# User Story: [US-020] Consulta somente-leitura de contratacoes pelo administrador

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Baixa (Could)
**Story Points:** 3
**Sprint:** Sprint 04
**Status:** Backlog
**Behavior Change Esperado:** YES

---

## Historia

**Como** administrador
**Eu quero** consultar as contratacoes do HelpMe com filtros
**Para que** eu entenda o que aconteceu num caso (reclamacao, suspensao) sem usar o painel do Supabase e sem ler as conversas

### Contexto Adicional

O painel (US-017) mostra so totais. Esta tela mostra as contratacoes uma a uma, **somente leitura**: o admin nao muda status nem le o chat (BR21). Ela complementa a US-019: antes de suspender, o admin ve o historico de contratacoes do profissional.

- **Requisitos de origem:** FR26, BR21 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-014 (area admin), US-017 (painel)
- **Repositorio de codigo:** raiz deste repositorio (branch a partir de `main`)

### Pontos de Esclarecimento

- Nenhum pendente: decisoes aprovadas pelo PO no Review & Adjust (2026-11-23).
  - A lista mostra **nomes** do cliente e do profissional, status e datas. **Nao** mostra endereco, telefone, descricao do servico nem mensagens (minimo necessario; BR21).
  - Sem tela de detalhe: a linha ja tem tudo o que pode ser mostrado.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** `admin-contratacoes.html` lista as contratacoes mais recentes primeiro, com: data de criacao, data desejada, status, nome do cliente e nome do profissional (com link para o detalhe do profissional no admin).
- [ ] **Criterio 2:** Filtros: status, periodo (7, 30, 90 dias ou todas) e busca por nome do cliente ou do profissional. Mostra o total encontrado e carrega de 50 em 50 ("Carregar mais").
- [ ] **Criterio 3:** Os dados vem de `rpc('contratacoes_admin', ...)`, `security definer`, que confere `eh_admin()` e devolve so as colunas acima. Nenhuma politica nova em `contratacoes` nem em `mensagens`.
- [ ] **Criterio 4:** A tela nao tem nenhuma acao de escrita; o admin nao abre o chat (BR21).
- [ ] **Criterio 5:** No detalhe do profissional (US-015/US-019) aparece o link "Ver contratacoes deste profissional", que abre a lista ja filtrada; no painel (US-017), a tabela de contratacoes leva a esta tela.
- [ ] **Criterio 6:** Cliente ou profissional chamando `contratacoes_admin` recebe erro de permissao (roteiro `supabase/testes/008_contratacoes_admin.sql`).
- [ ] **Criterio 7:** Sem resultados, a tela mostra "Nenhuma contratacao encontrada" e a opcao de limpar os filtros.
- [ ] **Criterio 8:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 9:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 10:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura passa por funcao que confere `eh_admin()`.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 0
- **Justificativa do nivel:** leitura sem regra de estado; a seguranca fica na funcao (`eh_admin()`).
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** regras em `docs/requirements/helpme-mvp-marco2.md` (rev. 3), versionadas em SQL.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** nao ha API propria; o boundary e o Supabase (RPC).
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A (traduzido em `js/admin-comum.js`)
- **BDD previsto:** N/A
- **Gates opcionais aplicaveis:** N/A; roteiro SQL manual em `supabase/testes/` (NFR11)
- **Touch List preliminar:** supabase/migrations/008_contratacoes_admin.sql (novo), supabase/testes/008_contratacoes_admin.sql (novo), helpme-app/admin-contratacoes.html + js/admin-contratacoes.js (novos), admin*.html (menu), js/admin-profissional.js (link), admin.html (link da tabela), assets/css/admin.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Lista em cards no celular e em tabela no computador, no padrao da area admin.

---

## Notas Tecnicas

### Arquitetura

- **Database changes:** `008_contratacoes_admin.sql` — funcao `contratacoes_admin(status, dias, busca, profissional_id, limite, deslocamento)` que devolve as linhas e o total.
- **APIs necessarias:** Supabase JS v2 via CDN (RPC).
- **Erros observaveis esperados:** mensagens amigaveis para rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-014
- [ ] US-017

### Consideracoes de Performance

- Filtro, ordenacao e paginacao no banco; indices existentes em `contratacoes (created_at)` por cliente e por profissional.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] N/A

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Comparar a lista com uma consulta no SQL Editor (por status e periodo).
- [ ] Chamar `contratacoes_admin()` como cliente → erro.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** `008_contratacoes_admin.sql` + roteiro de testes
- [ ] **[TASK-002]** Tela `admin-contratacoes.html` com filtros e paginacao
- [ ] **[TASK-003]** Links a partir do detalhe do profissional e do painel

---

## IA Insights

### Sugestoes de Implementacao

Uma unica funcao com filtros opcionais e `count(*) over ()` para devolver o total junto com a pagina.

### Riscos Identificados

Nomes de clientes passam a ser visiveis ao admin; e o minimo para atender reclamacoes. Endereco, telefone e conversa continuam fora.

### Alternativas Consideradas

- Politica de SELECT do admin em `contratacoes`: descartada, porque liberaria a linha inteira (endereco e descricao).

---

## Notas e Comentarios

- 2026-11-23: rascunho gerado a partir de FR26 (Could) para Review & Adjust do PO.
- 2026-11-23: aprovada pelo PO no Review & Adjust, com as decisoes propostas (recomendadas) sem ajuste.

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
