# Task Breakdown: [US-026] Avaliações no perfil público do profissional

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO); dupla 2 da Sprint 05 a definir
**Estimativa total:** 3 pontos (~4 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (falha ao ler as avaliações vira um aviso fixo na própria seção, com "Tentar de novo"; detalhe só no console)
**BDD associado:** N/A (roteiro SQL `supabase/testes/019_avaliacoes_publicas.sql` + teste de tela)
**Behavior change:** YES (o perfil público passa a listar avaliações com o primeiro nome do autor)
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec/Contract governado?** Não. Regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (FR35, NFR15, A11); boundary é o Supabase (RPC).
- **Touch List aplicada:** `supabase/migrations/019_avaliacoes_publicas.sql` (novo), `supabase/testes/019_avaliacoes_publicas.sql` (novo), `supabase/README.md`, `helpme-app/profissional.html`, `helpme-app/js/telas/perfil-profissional.js`, `helpme-app/assets/css/dashboard.css` (o CSS do perfil).
- **Banco real (lido em 2026-11-27):** o visitante não tem `select` em `usuarios` (014). A view `profissionais_publicos` é `security_invoker` e calcula média e total lendo `avaliacoes`.

## Checagem de Principios

- **É a abordagem mais simples?** Sim: uma função SQL (`language sql`, `stable`), sem tabela nem view nova. A tela usa um `rpc`.
- **Dependência externa nova?** Não.
- **Escopo respeita a Touch List?** Sim.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Função | `avaliacoes_do_profissional(p_profissional_id uuid)` devolve `nota`, `comentario`, `autor`, `criada_em`; as 20 mais recentes (`created_at desc, id desc`); só de profissional `aprovado`. `security definer` + `search_path = ''`; `execute` para `anon` e `authenticated`. |
| Primeiro nome | `split_part(btrim(regexp_replace(nome, '\s+', ' ', 'g')), ' ', 1)`; vazio vira "Cliente". A ordem importa: com `btrim` antes, um nome que começa com tab virava "Cliente" (pego ao validar a consulta no banco). |
| Onde fica a seção | Depois de "Contato": com 20 avaliações, o "Contratar" desceria muito no celular. A média e o total continuam no topo. |
| Carregamento | Depois de o perfil aparecer, sem segurar o "Contratar" (a mesma lição da US-025: o supabase-js tenta de novo por uns 7 s quando a leitura falha). Estados: carregando (`role=status`), vazio, erro (`role=alert` + "Tentar de novo") e lista. |
| Item | Estrelas `role="img"` com `aria-label` "Nota 4 de 5", na cor `#a3501a` (5,6:1); primeiro nome; data em `<time datetime>`; comentário com `white-space: pre-line`. Tudo por `textContent`. Sem comentário, o parágrafo sai. |
| Mais de 20 | Aviso "Mostrando as 20 avaliações mais recentes de N." (N = `total_avaliacoes` da view). |

### Fora do escopo (observação para o PO)

A política `avaliacoes: leitura publica` (001) deixa qualquer visitante ler a tabela `avaliacoes` direto, inclusive `usuario_id`, o id do cliente que avaliou. Sem `usuarios` legível, esse id sozinho não mostra nome nem telefone, mas permite ligar as avaliações de uma mesma pessoa. Fechar a leitura direta quebraria a média e o total do perfil (a view é `security_invoker`) e a leitura do próprio cliente na US-025. Isso pede uma mudança própria: por exemplo, média e total pela função e a avaliação do cliente por uma função "minha avaliação". Proposto como dívida, não feito aqui.

---

## Tasks Tecnicas

#### [TASK-001] Migration `019` e roteiro P1–P10
- **Estimativa:** 1,5 h
- **Critério de conclusão:** critério 3; roteiro com todas as linhas "ok" no banco real.

#### [TASK-002] Seção "Avaliações" em `profissional.html`
- **Estimativa:** 2,5 h
- **Dependências:** TASK-001
- **Critério de conclusão:** critérios 1, 2, 4, 5, 6 e 7.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| P1–P5 | Visitante: ordem, só primeiro nome, só 4 colunas, sem sobrenome, comentário nulo e com HTML | Confere | Done |
| P6–P8 | Id vazio; visitante sem ler `usuarios`; profissional não aprovado | Nada / sem leitura / nada | Done |
| P9–P10 | Logado também lê; nome vazio vira "Cliente"; limite de 20 | Confere | Done |
| T1–T19 | Tela com visitante e banco simulados: lista, estrelas com texto alternativo, data, comentário, vazio, HTML como texto, aviso de 20, falha só na seção com "Tentar de novo", leitura lenta, 360px, quebra de linha, contraste, 44px, Tab/foco | Todos passam | Done |

**Resultados (2026-11-27):** tela **19/19** (visitante e banco simulados: nenhum dado gravado). PO aplicou a `019`: roteiro **P1–P10 ok**. Pela API real, como visitante, a função devolve a avaliação 2 com autor "Ana" e só as 4 colunas. Telas da contratação no banco real: **99/99**, sem regressão.
