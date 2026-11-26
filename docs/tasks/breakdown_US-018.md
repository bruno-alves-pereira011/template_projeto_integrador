# Task Breakdown: [US-018] Gestão de categorias pelo administrador

**Data:** 2026-11-26
**Participantes:** Bruno Alves
**Estimativa total:** 3 pontos (~5 h)
**Nivel ScrumAIDev:** 0
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (erros do PostgREST 23505 / 23514 / 42501 traduzidos em `js/telas/admin-categorias.js`)
**BDD associado:** N/A
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. Regras em `docs/requirements/helpme-mvp-marco2.md` (FR22, BR20), versionadas em SQL.
- **US exige Contract governado?** Não. Escrita direta na tabela pelo PostgREST, protegida por RLS.
- **Justificativa do Nivel ScrumAIDev:** CRUD simples protegido por política de admin; o único risco real (apagar e levar os vínculos junto) é fechado por privilégio no banco e conferido no roteiro.
- **Touch List aplicada:** `supabase/migrations/013_categorias_admin.sql` (novo), `supabase/testes/013_categorias_admin.sql` (novo), `supabase/README.md`, `helpme-app/admin-categorias.html` (novo), `helpme-app/js/telas/admin-categorias.js` (novo), `helpme-app/js/servicos/categorias.js`, `helpme-app/js/telas/cliente.js`, `helpme-app/js/telas/completar-perfil.js`, menu de `admin.html`, `admin-analise.html`, `admin-profissionais.html`, `admin-profissional.html`, `admin-contratacoes.html` (e o card do painel), `helpme-app/assets/css/admin.css`. A story previa a `003_admin.sql` (já aplicada; a coluna `ativa` entrou na 005), por isso a mudança vai na 013.
- **Base da branch:** `feat/US-021-sinais-suspeita` (empilhada). A US-018 não depende das outras em regra, mas mexe no menu das páginas admin alteradas por US-019, DEBT-009 e US-021, ainda fora da `main`.
- **Banco:** as categorias atuais já seguem os formatos novos (conferido por leitura em 2026-11-26). A 013 é aplicada pelo PO.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Escrita | Direto na tabela, com políticas `categorias: admin cria` e `categorias: admin edita` (`eh_admin()`). Privilégio só nas colunas editáveis (`slug, nome, descricao, sigla, cor, ativa`): o id não é escolhido pelo app. |
| Apagar (BR20) | Sem `DELETE` para ninguém do app, nem admin (o `on delete cascade` levaria os vínculos). A tela não tem a opção; desativar = `ativa = false`. |
| Formatos (banco e tela) | slug `^[a-z0-9]+(-[a-z0-9]+)*$` até 40 (único, como já era); nome 2–40; sigla 1–3 maiúsculas/números; cor `#RRGGBB` (campo `type="color"`); descrição até 200. A tela gera o slug a partir do nome na criação e avisa que mudar o slug quebra links antigos (nenhuma tabela guarda o slug; só URLs). |
| Home | `carregarCategorias({ somenteAtivas: true })`: o filtro vai na consulta (`ativa=eq.true`). |
| Perfil e lista de profissionais | Continuam com todas as categorias: o chip de uma categoria desativada ainda precisa da cor/sigla, porque o vínculo é mantido. |
| `completar-perfil` | Mostra só as ativas. A sincronização só remove vínculos de categorias que estavam na tela: o vínculo com uma desativada nunca é apagado ao salvar (critério 4). |
| Menu | "Categorias — em breve" vira link nas cinco páginas admin e no card do painel. |
| Erros | 23505 → "Já existe uma categoria com este endereço" no campo slug; 23514 → mensagem do campo; update sem linha devolvida → "sem permissão". Desativar pede confirmação explicando que os vínculos ficam. |

---

## Tasks Tecnicas

#### [TASK-001] Formatos, privilégios e políticas (`013_categorias_admin.sql`)
- **Estimativa:** 1,5 h
- **Critério de conclusão:** critérios 2, 3, 5 e 8; G1–G18 com "ok" no banco real.

#### [TASK-002] Tela `admin-categorias.html` e menu
- **Estimativa:** 2,5 h
- **Critério de conclusão:** critérios 1, 2, 3, 6 e 7.

#### [TASK-003] Filtrar `ativa` na home e no `completar-perfil`
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 4, sem apagar vínculo com categoria desativada.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| G1–G2 | Admin cria "Jardineiro" e edita | Ok | Done |
| G3–G7 | Slug repetido, cor, slug e sigla fora do formato, id escolhido | Recusados pelo banco | Done |
| G8–G12 | Desativar a categoria do prof1, apagar, vínculo, leitura da situação, reativar | Desativa; apagar recusado até para admin; vínculo mantido; visitante lê `ativa`; reativa | Done |
| G13–G18 | Cliente, profissional e visitante tentam escrever | Insert recusado, update sem linha, delete recusado; nada mudou | Done |
| C0–C22, M1–M4, H1–H2, P1–P4 | Telas (login real de admin, cliente e prof1; tabela simulada no admin; nada gravado) | Menu e card do painel, lista com inativa, XSS, cor da sigla, slug automático, validações, criar/editar/desativar/reativar, 23505 e RLS, nunca DELETE; 360px, 44px, labels, foco; home pede só ativas; `completar-perfil` esconde a inativa e não apaga o vínculo | Done |

**Resultados (2026-11-26):** telas **37/37**; telas da US-013 (**42/42**) e da US-021 (**31/31**) sem regressão. `013` aplicada pelo PO (conferido por leitura: políticas `admin cria`/`admin edita`, 5 regras de formato, sem DELETE para `authenticated`). Roteiro 013 **18/18**. Ponta a ponta real **7/7**: admin vê as 6 categorias reais sem enviar nada; cliente tentando insert/update/delete direto no banco real é recusado (42501 / nenhuma linha / 42501); home real pede só ativas e mostra 6.
