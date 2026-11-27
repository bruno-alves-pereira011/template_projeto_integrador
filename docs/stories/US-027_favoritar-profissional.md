# User Story: [US-027] Favoritar profissional e ver "Meus favoritos"

**Epic:** EPIC-005 Pós-contratação e engajamento
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Média
**Story Points:** 3
**Sprint:** - (sugerida: Sprint 05 replanejada)
**Status:** To Do
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente
**Eu quero** favoritar profissionais e ver todos numa lista
**Para que** eu volte a eles rápido, sem refazer a busca por categoria

### Contexto Adicional

HU05 do README. A tabela `favoritos` já existe (001), com uma política `favoritos: tudo pelo dono` larga demais: qualquer logado favorita qualquer profissional, inclusive pendente, suspenso ou a si mesmo. Nenhuma tela usa a tabela. Decisões do PO: só o cliente favorita; o "Relatório de profissionais favoritos" (item 4 do README) fica para depois.

- **Requisitos de origem:** FR36, FR37, FR38, FR39, BR30, BR31, BR32, BR33, NFR16, NFR17, NFR18, A13–A16 (`docs/requirements/helpme-favoritos.md`)
- **Discovery:** `docs/discovery/helpme-favoritos.md`
- **Dependências:** nenhuma técnica (usa a view `profissionais_publicos` e o menu do DEBT-009)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Critério 1:** No perfil (`profissional.html`), o cliente logado vê o botão "Favoritar" / "Favoritado" e alterna com um toque; o estado se mantém ao recarregar e é anunciado a leitores de tela (`aria-pressed`). O estado carrega depois do perfil, sem atrasar o "Contratar" (FR36, NFR17).
- [ ] **Critério 2:** O visitante que toca no botão vai para o login e volta ao mesmo perfil. Profissional e admin não veem o botão, nem o profissional no próprio perfil (FR37, BR30).
- [ ] **Critério 3:** "Meus favoritos" (`meus-favoritos.html`, no menu do cliente) lista os favoritos do mais recente ao mais antigo, com nome, categorias, bairro e cidade, e nota, e cada item leva ao perfil. Os dados do profissional vêm só da view `profissionais_publicos`. Lista vazia: "Você ainda não tem favoritos. Toque em Favoritar no perfil de um profissional." com link para as categorias (FR38, NFR18).
- [ ] **Critério 4:** "Remover" na lista tira o favorito sem pedir confirmação e avisa "Removido dos favoritos" (`role="status"`) (FR39, A15).
- [ ] **Critério 5:** No banco, com roteiro SQL em que todas as linhas dão "ok" (BR30–BR33, NFR16):
  - só o cliente cria favorito, e só de profissional aprovado;
  - cada um lê e apaga só os próprios (profissional e admin não leem quem favoritou quem);
  - favoritar de novo não duplica; remover o que não existe não dá erro;
  - profissional que deixa de estar aprovado some da lista, mas o favorito continua guardado;
  - pelo app só se grava `usuario_id` e `profissional_id` (`created_at` do servidor), sem `update`; visitante não grava;
  - a migration apaga favoritos de quem não é cliente.
- [ ] **Critério 6:** Duplo clique e duas abas terminam no estado real, sem erro nem duplicata; falha de rede mostra aviso e o botão volta ao estado anterior.
- [ ] **Critério 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e os botões têm área de toque de pelo menos 44px.
- [ ] **Critério 8:** **Acessibilidade (NFR05):** campos têm `<label>`, foco visível em todos os elementos interativos, mensagens com `role="alert"`/`status` e texto com contraste adequado.
- [ ] **Critério 9:** **Segurança (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; texto vindo do banco sempre por `textContent`; toda regra vale no banco (RLS, trigger ou função), não só na tela.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 1
- **Justificativa do nivel:** comportamento observável com regra no banco; sem API própria nem runner de contrato.
- **US exige Spec governada?** Não
- **Justificativa da Spec:** regras em `docs/requirements/helpme-favoritos.md`, versionadas em SQL.
- **Spec prevista:** N/A
- **US exige Contract governado?** Não
- **Justificativa do Contract:** o boundary é o Supabase (PostgREST) protegido por RLS e permissões por coluna, documentado em `supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A (roteiro SQL + testes de tela)
- **Gates opcionais aplicaveis:** N/A; roteiro SQL em `supabase/testes/` (NFR16)
- **Touch List preliminar:** supabase/migrations/020_favoritos.sql (novo), supabase/testes/020_favoritos.sql (novo), supabase/README.md, supabase/seed.sql (se o favorito do seed precisar de ajuste), helpme-app/meus-favoritos.html (novo), helpme-app/js/telas/meus-favoritos.js (novo), helpme-app/profissional.html, helpme-app/js/telas/perfil-profissional.js, helpme-app/js/telas/navegacao.js, CSS do perfil/da lista
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrão visual atual (`global.css`, `dashboard.css`): o botão de favorito fica junto do "Contratar" no perfil; "Meus favoritos" reaproveita os cards da lista de profissionais (`profissionais.html`).

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (PostgREST).
- **Database changes:** Migration nova: troca `favoritos: tudo pelo dono` por políticas de ler e apagar os próprios e de criar só cliente com profissional aprovado; sem `update`; permissões por coluna (insert só de `usuario_id`, `profissional_id`); visitante sem escrita; apaga favoritos de quem não é cliente.
- **Referencias do modelo de dados:** `supabase/migrations/001_schema.sql` (tabela e política), `018_avaliacoes.sql` (padrão de permissões por coluna)
- **Erros observaveis esperados:** mensagens amigáveis na tela para regra recusada pelo banco, falha de rede e sessão expirada; detalhes só no console.

### Dependencias

- [ ] nenhuma (usa a view `profissionais_publicos` e o menu do DEBT-009)

### Consideracoes de Performance

- O estado do favorito no perfil carrega depois do perfil (lição da US-025/US-026: o supabase-js tenta de novo as leituras por alguns segundos quando falham).
- A lista faz duas leituras: os ids dos favoritos do cliente e os perfis pela view.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto)

### Testes de Integracao

- [ ] Roteiro SQL em `supabase/testes/` (desfaz tudo ao final) cobrindo BR30 a BR33.

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Cliente favorita no perfil → aparece no topo de "Meus favoritos" → remove pela lista → o perfil volta a "Favoritar".
- [ ] Visitante toca "Favoritar" → login como cliente → volta ao perfil.
- [ ] Profissional e admin abrem o perfil de outro profissional → sem botão de favorito.
- [ ] Critérios comuns de mobile e acessibilidade verificados (360px, navegação por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Migration de favoritos e roteiro SQL
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Botão de favorito no perfil
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Tela "Meus favoritos" e item no menu do cliente
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

Regras no banco primeiro (migration + roteiro SQL), depois a tela; mesmo padrão das migrations 003 a 019.

### Riscos Identificados

Ver `docs/discovery/helpme-favoritos.md` (seção Risks).

### Alternativas Consideradas

Ver Key Decisions em `docs/requirements/helpme-favoritos.md`.

---

## Notas e Comentarios

- 2026-11-27: story gerada no Modo Backlog a partir de `docs/requirements/helpme-favoritos.md` (REQUIREMENTS_READY), aprovada pelo PO.

---

## Definition of Done Checklist

- [ ] Código implementado conforme os critérios de aceitação
- [ ] Roteiro SQL com todas as linhas "ok" no banco real
- [ ] Code review por quem não escreveu o código
- [ ] Critérios comuns de mobile e acessibilidade verificados
- [ ] Documentação atualizada (`supabase/README.md` quando o banco mudar)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovação do Product Owner
