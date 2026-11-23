# User Story: [US-019] Suspender e reativar profissional aprovado

**Epic:** EPIC-006 Administracao e aprovacao de profissionais
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Baixa (Could)
**Story Points:** 5
**Sprint:** Sprint 04
**Status:** In Progress
**Behavior Change Esperado:** YES

---

## Historia

**Como** administrador
**Eu quero** suspender um profissional aprovado, com motivo, e reativa-lo depois
**Para que** eu tire do ar quem esta causando problema sem apagar o cadastro nem o historico

### Contexto Adicional

Hoje o admin so decide quem esta `pendente` (US-015). Depois de aprovado, nao ha como tirar um profissional do diretorio pelo app. A suspensao e um quarto status, `suspenso`: como todas as regras do banco testam `status_aprovacao = 'aprovado'` (diretorio, contratar, aceitar, avaliar), o suspenso sai de tudo isso sem mexer nessas regras.

Para achar um aprovado, o admin precisa de uma lista de profissionais por status (a fila so mostra pendentes). Por isso a story sobe de 3 para 5 pontos.

- **Requisitos de origem:** FR25, BR11, BR19, NFR10 (`docs/requirements/helpme-mvp-marco2.md` (rev. 3))
- **Decisoes:** D6, D7 (`docs/DECISOES.md`)
- **Dependencias:** US-015 (historico e detalhe do admin), US-017 (indicadores por status)
- **Repositorio de codigo:** raiz deste repositorio (branch a partir de `main`)

### Pontos de Esclarecimento

- Nenhum pendente: decisoes aprovadas pelo PO no Review & Adjust (2026-11-23).
  - Suspenso **nao usa o app**: ao entrar, ve `bloqueio.html` com o motivo. Contratacoes ja aceitas continuam e o **cliente** pode concluir (BR06).
  - Solicitacoes ainda `solicitada` de um suspenso ficam como estao; o cliente pode cancelar.
  - Reativar volta direto para `aprovado`, sem nova triagem; o motivo da reativacao e opcional.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** Migration `007_suspensao.sql`: `status_aprovacao` aceita `suspenso`; `analises_profissional.acao` aceita `suspensao` e `reativacao`; o banco exige motivo de 10 a 500 caracteres na suspensao.
- [ ] **Criterio 2:** `admin-profissionais.html` lista os profissionais com nome, cidade, categorias e status; filtra por status e busca por nome; cada item leva ao detalhe (`admin-profissional.html`). Menu "Profissionais" na area admin.
- [ ] **Criterio 3:** No detalhe, profissional `aprovado` mostra "Suspender" (motivo obrigatorio, 10 a 500); `suspenso` mostra "Reativar" (motivo opcional, ate 500). A funcao confere o status no momento da acao (so `aprovado → suspenso` e `suspenso → aprovado`); se outro admin ja mudou, a tela avisa e recarrega.
- [ ] **Criterio 4:** Toda suspensao e reativacao grava no historico o admin, a acao, o motivo e a data, e aparece no historico do detalhe (BR19, NFR10). O admin nao suspende o proprio cadastro.
- [ ] **Criterio 5:** O suspenso some do diretorio e do perfil publico, nao pode ser contratado nem aceitar solicitacao; contratacoes `aceita` continuam e o cliente pode concluir.
- [ ] **Criterio 6:** O profissional suspenso que entra no app vai para `bloqueio.html`, que mostra "Cadastro suspenso", o motivo e a data, sem opcao de reenviar para analise.
- [ ] **Criterio 7:** O painel de indicadores (US-017) conta os suspensos; a fila de analise nao muda.
- [ ] **Criterio 8:** Cliente ou profissional chamando as funcoes de suspensao/lista pela API recebe erro de permissao; o profissional nao muda o proprio status (roteiro `supabase/testes/007_suspensao.sql`).
- [ ] **Criterio 9:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 10:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 11:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS ou por funcao `security definer` que confere `eh_admin()`.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** muda a maquina de status do profissional e o controle de acesso; historico auditavel.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** regras em `docs/requirements/helpme-mvp-marco2.md` (rev. 3), versionadas em SQL; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** nao ha API propria; o boundary e o Supabase (RPC) protegido por `eh_admin()`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A (errcode 42501 / 22023, traduzidos em `js/admin-comum.js`)
- **BDD previsto:** `docs/bdd/aprovacao_profissionais.feature` (novos cenarios de suspensao, revisao manual)
- **Gates opcionais aplicaveis:** N/A; roteiro SQL manual em `supabase/testes/` (NFR11)
- **Touch List preliminar:** supabase/migrations/007_suspensao.sql (novo), supabase/testes/007_suspensao.sql (novo), helpme-app/admin-profissionais.html + js/admin-profissionais.js (novos), helpme-app/admin-profissional.html, js/admin-profissional.js, js/admin-comum.js, bloqueio.html, js/bloqueio.js, js/sessao.js (comentario do status), admin*.html (menu), assets/css/admin.css
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao da area admin (`admin.css`, cards e selos da fila da US-015).

---

## Notas Tecnicas

### Arquitetura

- **Database changes:** `007_suspensao.sql` — troca dos `check` de `status_aprovacao` e de `analises_profissional.acao`; funcoes `profissionais_admin(status, busca)`, `alterar_suspensao(id, acao, motivo)` e `minha_ultima_decisao()` (o profissional le o motivo da propria suspensao; reaproveitavel pela US-013); `detalhe_profissional_admin` e `painel_admin` passam a tratar `suspenso`.
- **APIs necessarias:** Supabase JS v2 via CDN (RPC).
- **Erros observaveis esperados:** mensagens amigaveis para rede/permissao; detalhes so no console.

### Dependencias

- [ ] US-015
- [ ] US-017

### Consideracoes de Performance

- Lista com limite e busca no banco; indices existentes em `profissionais (status_aprovacao)`.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] N/A

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Suspender um aprovado sem motivo → bloqueado; com motivo → some do diretorio; historico mostra admin e motivo.
- [ ] Entrar como o suspenso → `bloqueio.html` com o motivo.
- [ ] Reativar → volta ao diretorio.
- [ ] Executar `supabase/testes/007_suspensao.sql` → OK.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] `docs/bdd/aprovacao_profissionais.feature` (revisao manual)

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** `007_suspensao.sql` (status, historico e funcoes) + roteiro de testes
- [ ] **[TASK-002]** Lista `admin-profissionais.html`
- [ ] **[TASK-003]** Suspender/Reativar no detalhe
- [ ] **[TASK-004]** "Cadastro suspenso" em `bloqueio.html`

---

## IA Insights

### Sugestoes de Implementacao

Reaproveitar o padrao da `decidir_profissionais` (trava `for update`, confere o status, grava historico) numa funcao propria, para a suspensao nao misturar regras com a fila.

### Riscos Identificados

Profissional suspenso com contratacao aceita perde o acesso ao chat; o cliente continua podendo concluir. Se a equipe quiser que o suspenso termine os servicos aceitos pelo app, muda a regra do `sessao.js` (ajuste no Review & Adjust).

### Alternativas Consideradas

- Coluna `suspenso boolean` separada do status: descartada, porque exigiria mudar todas as regras que testam `aprovado`.
- Voltar o suspenso para `pendente`: descartada, porque ele cairia na fila e na aprovacao em lote.

---

## Notas e Comentarios

- 2026-11-23: rascunho gerado a partir de FR25 (Could) para Review & Adjust do PO.
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
