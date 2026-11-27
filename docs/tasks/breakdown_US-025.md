# Task Breakdown: [US-025] Avaliar o profissional depois do serviço

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO); dupla 2 da Sprint 05 a definir
**Estimativa total:** 3 pontos (~6 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (RLS e constraints respondem em inglês; `traduzirErroAvaliacao` em `js/servicos/contratacao-comum.js` transforma cada código em texto fixo)
**BDD associado:** N/A (roteiro SQL `supabase/testes/018_avaliacoes.sql` + testes de tela)
**Behavior change:** YES (fecha a avaliação pela API sem contratação concluída; o autor deixa de poder apagar; apaga a avaliação do seed)
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. Regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (FR33, FR34, BR27, BR28, BR29, NFR13), versionadas em SQL.
- **US exige Contract governado?** Não. O boundary é o Supabase (PostgREST), protegido por RLS e permissões por coluna.
- **Touch List aplicada:** `supabase/migrations/018_avaliacoes.sql` (novo), `supabase/testes/018_avaliacoes.sql` (novo), `supabase/README.md`, `helpme-app/servico-andamento.html`, `helpme-app/js/telas/servico-andamento.js`, `helpme-app/js/telas/contratacoes.js`, `helpme-app/assets/css/contratacao.css`. **Fora da Touch List preliminar:**
  - `helpme-app/js/servicos/contratacao-comum.js`: leitura, gravação e tradução de erro da avaliação, no mesmo lugar das funções de orçamento.
  - `supabase/seed.sql`: criava avaliação sem contratação concluída; rodar o seed de novo desfaria a BR29.
  - `supabase/testes/contratacao_api.mjs`: US25-01 a US25-04, só recusas.
- **Banco real (lido em 2026-11-27):** 2 avaliações. A id 1 (nota 5, do seed, para o prof1) não tem contratação entre autor e profissional e sai (BR29). A id 2 (cliente@ → prof2, nota 4) tem as contratações 163 e 164 concluídas e fica.

## Checagem de Principios

- **É a abordagem mais simples?** Sim. As políticas que já existiam (001) ganham a condição da BR27, e a de apagar sai. A escrita continua direta na tabela, sem função nova. A regra "só nota e comentário" fica nas permissões por coluna, sem trigger novo.
- **Dependência externa nova?** Não.
- **Escopo respeita a Touch List?** Sim, com as três exceções registradas acima.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| BR27 no banco | `autor cria` e `autor edita` exigem `usuario_id = auth.uid()`, profissional aprovado (como antes) e contratação `concluida` com `cliente_id = auth.uid()` e aquele profissional. A consulta passa pelo RLS de `contratacoes` (o cliente enxerga as próprias). |
| Edição sem brecha | Achado ao ler o banco: `autor edita` aceitava qualquer coluna (mover a avaliação para outro profissional aprovado, forjar `created_at`). Agora `revoke insert, update, delete` da tabela e `grant insert (usuario_id, profissional_id, nota, comentario)` / `grant update (nota, comentario)`. `anon` também tinha `insert`/`update` (o RLS barrava) e perdeu. |
| BR28 | Sem política e sem permissão de `delete` para `authenticated`. Profissional e admin não têm política de escrita. |
| BR29 | A migration apaga as avaliações sem contratação concluída entre as partes (decisão do PO) e confere no final. O `seed.sql` passa a criar um serviço concluído com o prof2, com valor aprovado (BR23), antes da avaliação dele, e não cria mais a do prof1. |
| Duas concluídas com o mesmo profissional | Uma avaliação só (unique da 001). A tela lê a avaliação por cliente + profissional, então as duas contratações mostram a mesma; o link da lista diz "Ver minha avaliação". |
| Tela | Bloco em `servico-andamento.html`, só para o cliente e só na `concluida`. Nota em `fieldset` com 5 radios (reaproveita `.grupo-opcoes`/`.opcao`, 44px e foco visível); comentário com `maxlength` 500 e contador; "Editar avaliação" abre o formulário preenchido; sem botão de apagar. Estrelas só decorativas (`aria-hidden`), na cor `#a3501a` (5,6:1), porque o laranja da marca fica abaixo de 3:1. |
| Releitura | A avaliação é lida **depois** de a contratação aparecer: o supabase-js tenta de novo sozinho por uns 7 s quando a leitura falha, e isso não pode segurar a tela inteira. Se falhar, só o bloco avisa, sem formulário (enviar às cegas daria duplicada). O Realtime da contratação não apaga o que está sendo digitado. |
| Erros | `42501` (RLS/permissão) → texto fixo; `23505` (já avaliou em outra aba) → aviso e releitura; `23514` → nota/comentário; rede e sessão expirada → textos próprios. |
| Testes no banco real | `contratacao_api.mjs` só testa recusas (US25-01 a 04). Avaliação criada pela API não pode ser apagada pelo app (BR28) e ficaria no perfil do prof1. A criação com contratação concluída fica no roteiro SQL, que se desfaz. |

---

## Tasks Tecnicas

#### [TASK-001] Migration `018_avaliacoes.sql`, roteiro A1–A16 e seed
- **Estimativa:** 2,5 h
- **Critério de conclusão:** critérios 3, 4 e 5; roteiro com todas as linhas "ok" no banco real.

#### [TASK-002] Bloco de avaliação em `servico-andamento.html`
- **Estimativa:** 2,5 h
- **Dependências:** TASK-001
- **Critério de conclusão:** critérios 1, 2, 6, 7 e 8.

#### [TASK-003] Link em Minhas contratações e testes
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 1 ("Avaliar profissional" / "Ver minha avaliação"); US25-01..04 no banco real.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| A1 | Cliente só com contratação cancelada com o prof1 avalia | Recusado (42501) | Done |
| A2–A4 | Com concluída: avalia; segunda avaliação (duas concluídas); edita nota e comentário | Cria; recusa a segunda (23505); edita | Done |
| A5–A9 | Autor muda o profissional, a data; apaga; nota 6; comentário 501 | Tudo recusado | Done |
| A10–A13 | Em nome de outra pessoa; profissional avaliado edita; profissional avalia outro; admin edita | Recusado / 0 linhas | Done |
| A14–A16 | Visitante avalia; visitante lê; nenhuma avaliação sem concluída | Recusa; lê; confere | Done |
| T1–T31 | Tela com sessão e banco simulados: quem vê, nota obrigatória, contador, duplo clique, criar e editar só com as colunas certas, cancelar edição, sem apagar, recusas (RLS em inglês, duplicada, rede), leitura lenta ou falhando, HTML no comentário como texto, `#avaliacao`, links da lista, 360px, 44px, labels, Tab/foco | Todos passam | Done |
| US25-01..04 | Banco real (`contratacao_api.mjs`), depois da 018 | Recusas | Done |

**Resultados (2026-11-27):** telas **33/33** (sessão e banco simulados: nenhum dado gravado); US-022 e US-023 na mesma tela sem regressão (**23/23** cada). PO aplicou a `018`: roteiro **A1–A16 ok**; só a avaliação 2 ficou (a 1, do seed, saiu pela BR29). Banco real com login: API **71/71** (US25-01..04; a avaliação 2 continuou intacta) e telas **99/99**, sem regressão.
