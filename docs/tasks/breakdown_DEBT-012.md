# Task Breakdown: [DEBT-012] Banco recusa descrição e endereço vazios na contratação

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO); dupla 1 da Sprint 05 a definir
**Estimativa total:** 1 ponto (~1,5 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (violação de constraint, `23514`; o formulário já impede o caso, então não há texto novo na tela)
**BDD associado:** N/A (roteiro SQL `supabase/testes/017_contratacao_campos_obrigatorios.sql` + `contratacao_api.mjs` US7-09)
**Behavior change:** YES (só na API: o banco passa a recusar o que antes só o formulário recusava)
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **Origem:** achado US7-09 dos testes de 2026-11-09, registrado na retrospectiva da Sprint 03 e aprovado pelo PO em 2026-11-27.
- **US exige Spec/Contract governado?** Não. É uma regra de integridade no banco, sem API própria.
- **Touch List:** `supabase/migrations/017_contratacao_campos_obrigatorios.sql` (novo), `supabase/testes/017_contratacao_campos_obrigatorios.sql` (novo), `supabase/testes/contratacao_api.mjs` (US7-09), `supabase/README.md`.
- **Dados reais (conferido só lendo, 2026-11-27):** uma linha em branco, a contratação **207** (`descricao = '   '`, `endereco = '   '`, `solicitada`), criada pelo próprio US7-09 no teste da US-023. Ela não tem a etiqueta `[TESTE AUTO]`, então a limpeza de costume não a apaga.

## Checagem de Principios

- **É a abordagem mais simples?** Sim: duas `check` constraints numa migration nova (DEBT-008), ao lado dos limites de tamanho da 014. Nada no trigger nem no front.
- **Dependência externa nova?** Não.
- **Escopo respeita a Touch List?** Sim.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| O que é "em branco" | `~ '\S'` (precisa de ao menos um caractere que não seja espaço, tab ou quebra de linha), o mesmo critério do `trim()` do formulário. O backlog falava em `btrim`, mas `btrim` sem argumentos só tira espaços: `E'\t\n'` passaria. |
| Linhas já em branco | A migration **para** com a lista de ids e um `delete` sugerido no comentário; não apaga dado sozinha. O PO apaga a 207 e roda de novo. |
| Quem é barrado | Todos, inclusive o painel (`postgres`): uma contratação sem descrição não tem uso. |
| Texto gravado | Não é aparado no banco; " Rua 1 " continua como foi enviado (o formulário já envia aparado). |

---

## Tasks Tecnicas

#### [TASK-001] Migration `017` e roteiro E1–E8
- **Estimativa:** 1 h
- **Critério de conclusão:** roteiro com todas as linhas "ok" no banco real.

#### [TASK-002] `contratacao_api.mjs` US7-09
- **Estimativa:** 0,5 h
- **Critério de conclusão:** US7-09 deixa de ser "[observacao]" e espera `400` com código `23514`; API 67/67 no banco real.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| E1–E4 | Cliente cria com descrição/endereço `'   '`, `''`, tab e quebra de linha | Recusado (`check_violation`) | Done |
| E5–E6 | Texto com espaços em volta; um caractere | Aceito | Done |
| E7 | Painel (`postgres`) deixa a descrição em branco | Recusado | Done |
| E8 | A válida fica como foi gravada | Confere | Done |
| US7-09 | Pela API (PostgREST) | `400` / `23514` | Done |

**Resultados:** pendente. O PO apaga a 207, aplica a `017` e roda o roteiro; depois, `contratacao_api.mjs`.
