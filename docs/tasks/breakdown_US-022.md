# Task Breakdown: [US-022] Enviar e responder orçamento da contratação

**Data:** 2026-11-27
**Participantes:** Bruno Alves (PO); dupla 1 da Sprint 05 a definir
**Estimativa total:** 5 pontos (~8 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (erros das funções com `errcode` 22023 / 42501 e mensagem em português, traduzidos em `js/servicos/contratacao-comum.js`)
**BDD associado:** N/A (roteiro SQL `supabase/testes/015_orcamentos.sql` + testes de tela)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. Regras em `docs/requirements/helpme-marco3-orcamento-avaliacao.md` (FR27–FR30, BR24–BR26, NFR12, NFR13), versionadas em SQL.
- **US exige Contract governado?** Não. O boundary é o Supabase (PostgREST/RPC) protegido por RLS e por funções `security definer`.
- **Justificativa do Nivel ScrumAIDev:** comportamento observável com regra no banco; sem API própria nem runner de contrato. Nível 2+ não acrescenta nada que o roteiro SQL não cubra.
- **Touch List aplicada:** `supabase/migrations/015_orcamentos.sql` (novo), `supabase/testes/015_orcamentos.sql` (novo), `supabase/README.md`, `helpme-app/servico-andamento.html`, `helpme-app/js/telas/servico-andamento.js`, `helpme-app/js/servicos/contratacao-comum.js`, `helpme-app/assets/css/contratacao.css`.
- **Base da branch:** `main` (todas as branches anteriores mescladas em 2026-11-27).
- **Banco:** 1 contratação `aceita` no banco real; nenhuma tabela de orçamento. A 015 é aplicada pelo PO.

## Checagem de Principios

- **É a abordagem mais simples?** Sim. A contratação não ganha status novo (key decision do Requirements): uma tabela `orcamentos` guarda o histórico e duas funções fazem as mudanças. A alternativa de colunas em `contratacoes` perderia o histórico (FR30) e obrigaria a mexer no trigger `validar_contratacao`, que só aceita mudança de status.
- **Dependência externa nova?** Não.
- **Escopo respeita a Touch List?** Sim. A regra de conclusão com valor aprovado e o cancelamento ficam para a US-023; a situação na lista, para a US-024.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Valor | `valor_centavos integer` entre 100 e 10.000.000 (R$ 1,00 a R$ 100.000,00, BR26 / NFR12). A tela aceita `350`, `350,5`, `1.234,56` e `R$ 1.234,56` e mostra `R$ 1.234,56` (`Intl.NumberFormat`). |
| Situação | `aguardando` → `aprovado` ou `recusado`; `respondido_em` preenchido só na resposta (check no banco). |
| Um por vez (BR24) | Índices únicos parciais: um `aguardando` e um `aprovado` por contratação. Seguram também a corrida entre duas abas. |
| Escrita | Ninguém escreve na tabela pelo app (sem INSERT/UPDATE/DELETE para `anon`/`authenticated`). `enviar_orcamento()` e `responder_orcamento()` são `security definer`, `search_path` fixo, e travam a linha da contratação (`for update`). |
| Quem faz o quê (BR25) | Envia: o profissional da contratação, aprovado, com a contratação `aceita`, sem valor aguardando nem aprovado. Responde: o cliente da contratação, com ela `aceita` e o orçamento `aguardando`. |
| Leitura | Política só das partes (`cliente_id` ou `profissional_id` da contratação). O admin não lê pela tabela (padrão da BR21). |
| Erros | Regra recusada: `22023` com a mensagem exata ("Já existe um valor aguardando a resposta do cliente."). Quem não é a parte certa: `42501`, com a mesma mensagem exista ou não a contratação (não revela ids de outros). |
| Tempo real | `orcamentos` entra na publicação `supabase_realtime` (como `mensagens`); a tela assina as mudanças daquela contratação e recarrega. O RLS filtra os eventos. |
| Aprovar | Pede confirmação ("Aprovar R$ 350,00? Depois de aprovado, o valor não muda."). Recusar não pede: o profissional pode mandar outro. |

---

## Tasks Tecnicas

#### [TASK-001] Migration `015_orcamentos.sql`
- **Estimativa:** 2,5 h
- **Critério de conclusão:** tabela, índices, RLS, privilégios, funções, Realtime e autoconferência; critérios 2 (banco), 4 e 6 da story.

#### [TASK-002] Roteiro `supabase/testes/015_orcamentos.sql`
- **Estimativa:** 1,5 h
- **Critério de conclusão:** todas as linhas "ok" no banco real, sem gravar nada.

#### [TASK-003] Bloco "Orçamento" em `servico-andamento.html`
- **Estimativa:** 3 h
- **Dependências:** TASK-001
- **Critério de conclusão:** critérios 1, 2 (tela), 3, 4 e 5; critérios comuns (360px, 44px, acessibilidade, `textContent`).

#### [TASK-004] Documentação
- **Estimativa:** 0,5 h
- **Critério de conclusão:** `supabase/README.md` com a 015 e o roteiro; story e backlog atualizados.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| O1–O4 | Profissional envia; envia de novo com um aguardando; terceiro, cliente e visitante tentam enviar | Só o primeiro envio passa | Done |
| O5–O9 | Leitura: cliente e profissional leem; outro profissional, admin e visitante não; escrita direta na tabela | Partes leem; o resto 0 linhas ou sem permissão | Done |
| O10–O14 | Cliente recusa; responde de novo; profissional tenta responder; novo valor; cliente aprova | Recusa e aprovação valem uma vez; histórico com 2 linhas | Done |
| O15–O18 | Depois do aprovado: novo envio; limites de valor (99, 10.000.001) e observação com 201 | Recusados | Done |
| O19 | Contratação `solicitada` | Envio recusado | Done |
| T1–T20 | Telas com sessão e respostas simuladas (nada gravado): estados do profissional e do cliente, validação do valor, duplo clique, histórico, erro do banco, XSS, 360px, 44px, labels | Todos passam | Done |

**Resultados (2026-11-27):** telas **23/23** (sessão e banco simulados: nenhum dado gravado); telas que carregam `contratacao-comum.js` sem regressão (58/58); leitura de valor conferida em Node (`350`, `350,5`, `1.234,56`, `R$ 1.234,56`, `1234.56`, `0,99`; `abc`, `-5`, `1,234` e `3,505` recusados). Banco real: PO aplicou a `015` e rodou o roteiro, **O1–O23 ok**; conferência só de leitura confirmou RLS, privilégios, funções, índices e Realtime, sem sobras do roteiro. **Pendente:** teste ponta a ponta logado (depende da senha de teste).
