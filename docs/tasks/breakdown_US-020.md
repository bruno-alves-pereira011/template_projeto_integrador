# Task Breakdown: [US-020] Consulta somente-leitura de contratações pelo administrador

**Data:** 2026-11-23
**Participantes:** Bruno Alves
**Estimativa total:** 3 pontos (~5 h)
**Nivel ScrumAIDev:** 0
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (traduzido em `js/admin-comum.js`)
**BDD associado:** N/A
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** leitura sem regra de estado; a segurança fica em `contratacoes_admin()` (`exigir_admin()`), coberta por `supabase/testes/008_contratacoes_admin.sql`.
- **Touch List aplicável:** `supabase/migrations/008_contratacoes_admin.sql` (novo), `supabase/testes/008_contratacoes_admin.sql` (novo), `helpme-app/admin-contratacoes.html` + `js/admin-contratacoes.js` (novos), menu em `admin.html`, `admin-analise.html`, `admin-profissional.html`, `admin-profissionais.html`, link em `admin-profissional.html`/`js/admin-profissional.js` e `admin.html`, `assets/css/admin.css`, `supabase/README.md`.
- **Base da branch:** `feat/US-019-suspensao` (menu "Profissionais" e detalhe com suspensão).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Dados | `contratacoes_admin()` devolve só id, datas, status, nome do cliente, id e nome do profissional, e o total. Sem endereço, telefone, descrição ou mensagens (decisão do PO, 2026-11-23; BR21). |
| Acesso | Função `security definer` com `exigir_admin()`; nenhuma política nova em `contratacoes` ou `mensagens` (a autoconferência da 008 recusa política de admin nessas tabelas). |
| Filtros | Status, período (7, 30, 90 dias ou todas; padrão 30), parte do nome do cliente ou do profissional, e profissional (`?profissional=<uuid>`, vindo do detalhe, abre sem limite de período). `%` e `_` digitados são texto. |
| Paginação | 50 por vez, `count(*) over ()` para o total, "Carregar mais". |
| Tela | Tabela no computador; no celular cada linha vira card com rótulos (`data-rotulo`). Status por extenso e com selo (texto + cor). |
| Somente leitura | Nenhum botão de ação na lista; o nome do profissional leva ao detalhe do admin, nunca ao chat. |

---

## Tasks Tecnicas

#### [TASK-001] `008_contratacoes_admin.sql` + roteiro
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 2, 3 e 6; C1–C13 com "ok" no banco real.

#### [TASK-002] `admin-contratacoes.html` com filtros e paginação
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 1, 2, 4, 7, 8, 9 e 10.

#### [TASK-003] Links do detalhe e do painel
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 5.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| C1–C3 | Cliente, profissional e visitante | Erro de permissão / sem execute | Done |
| C4–C8 | Filtros com 6 contratações conhecidas | Todas 6; 30 dias 4; 7 dias 3; concluídas 2; do prof1 3; busca por cliente e profissional | Done |
| C9–C10 | `%` literal; paginação | Nada encontrado; páginas 4 + 2 sem repetir, mais recentes primeiro | Done |
| C11 | Colunas devolvidas | Sem endereço, descrição, telefone ou chat | Done |
| C12a–C12c | Parâmetros inválidos | Recusados (status, período, limite) | Done |
| C13 | BR21 | Admin continua sem ler `mensagens` e `contratacoes` direto | Done |
| T1–T25, Z | Tela (login real de admin, RPC simulada) | Padrão 30 dias; linhas; link ao detalhe; sem chat nem escrita; paginação; filtros; XSS; vazio e limpar; filtro por profissional; 360px em cards; 44px; avisos sem a 008 e 42501; links do detalhe e do painel; nada gravado | Review |

**Resultados (2026-11-23):** tela **26/26**; regressão da US-019 **33/33**; `008` aplicada pelo PO; roteiro SQL **15/15**; ponta a ponta real, só leitura, **19/19** (com a US-019).
