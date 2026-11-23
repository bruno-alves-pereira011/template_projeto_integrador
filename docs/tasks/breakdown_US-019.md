# Task Breakdown: [US-019] Suspender e reativar profissional aprovado

**Data:** 2026-11-23
**Participantes:** Bruno Alves
**Estimativa total:** 5 pontos (~8 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (errcode 42501 / 22023, traduzidos em `js/admin-comum.js`)
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (cenários FR25, revisão manual)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** muda a máquina de status do profissional e o controle de acesso; histórico auditável (BR19, NFR10), coberto por `supabase/testes/007_suspensao.sql`.
- **Touch List aplicável:** `supabase/migrations/007_suspensao.sql` (novo), `supabase/testes/007_suspensao.sql` (novo), `supabase/testes/006_painel.sql` (P5 com `@>`), `helpme-app/admin-profissionais.html` + `js/admin-profissionais.js` (novos), `admin-profissional.html`, `js/admin-profissional.js`, `js/admin-comum.js`, `admin.html`, `js/admin.js`, `admin-analise.html` (menu), `bloqueio.html`, `js/bloqueio.js`, `js/sessao.js` (comentários), `assets/css/admin.css`, `assets/css/auth.css`, `supabase/README.md`, BDD.
- **Base da branch:** `docs/US-019-020-stories` (stories aprovadas), a partir da `main` com US-014 a US-017.
- **Banco:** durante a implementação o MCP do Supabase recusou a senha do `postgres` (depois voltou e a conferência por leitura foi feita). A `007` confere sozinha se a 005 e a 006 existem e procura os `check` pelo texto da regra, sem depender dos nomes.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Status | Quarto valor `suspenso` em `status_aprovacao`. Todas as regras do 001 testam `= 'aprovado'`, então o suspenso sai do diretório, do perfil público, de contratar, de aceitar e de avaliar sem mexer nelas. Concluir a contratação aceita não depende de aprovação (BR06), e o cliente conclui. |
| Funções | `alterar_suspensao(id, acao, motivo)`: trava a linha, só `aprovado → suspenso` e `suspenso → aprovado`, grava o histórico; `ignorado` quando o status já mudou ou é o próprio cadastro. `profissionais_admin(...)`: lista paginada com total. `minha_ultima_decisao()`: o profissional lê a última decisão sobre ele (reaproveitável pela US-013). |
| Motivo | Suspensão 10–500 (função e `check` no banco). Reativação opcional, até 500. |
| Painel | `painel_admin()` recriada igual à 006, com `suspenso` na contagem por status (cópia feita por script e conferida por `diff`). |
| Tela do suspenso | `bloqueio.html` ganha "Seu cadastro está suspenso" com o motivo e a data; se a leitura do motivo falhar, o painel aparece sem ele. Sem reenvio (só o admin reativa). |
| Navegação | Menu "Profissionais" em todas as páginas do admin; tiles "Aprovados" e "Suspensos" do painel abrem a lista filtrada; o detalhe aberto pela lista volta para a lista (`?de=profissionais`). |
| Decisões do PO | Suspenso bloqueado no app; solicitações sem resposta ficam como estão; reativar volta direto a aprovado (Review & Adjust, 2026-11-23). |
| Impacto na US-021 | A BR18 (aprovado que edita com alerta volta a pendente) **não** deve tocar em `suspenso`. |

---

## Checagem de Principios (condicional)

- [x] Um status novo em vez de uma coluna paralela: nenhuma regra antiga precisou mudar.
- [x] Sem dependência nova.
- [x] Touch List respeitada.

---

## Tasks Tecnicas

#### [TASK-001] `007_suspensao.sql` + roteiro `supabase/testes/007_suspensao.sql`
- **Estimativa:** 3 h
- **Critério de conclusão:** critérios 1, 3, 4, 5, 7 e 8; S1–S12 com "ok" no banco real.

#### [TASK-002] Lista `admin-profissionais.html`
- **Estimativa:** 2 h
- **Critério de conclusão:** critério 2; 360px, 44px.

#### [TASK-003] Suspender/Reativar no detalhe
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 3 e 4.

#### [TASK-004] "Cadastro suspenso" em `bloqueio.html`
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 6.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| S1–S3 | Cliente, profissional e visitante | Erro de permissão / sem execute (critério 8) | Done |
| S4a–S4d | Lista | Filtro por status, busca sem diferenciar maiúsculas, `%` não é curinga, status inválido recusado | Done |
| S5–S6b | Suspender | Motivo curto recusado; prof1 suspenso; histórico com admin e motivo | Done |
| S7a–S7c | Efeitos | Fora do diretório; cliente não contrata; cliente conclui a aceita | Done |
| S8a–S8c | Profissional | Lê o próprio motivo; não se reativa; não lê a decisão de outro | Done |
| S9a–S9c | Admin | Detalhe com suspensão no histórico; painel conta suspensos; fila não muda | Done |
| S10a–S10c | Ignorados | Suspender de novo, suspender pendente, próprio cadastro | Done |
| S11a–S11c, S12 | Reativar | Volta ao diretório; histórico sem motivo; reativar aprovado ignorado; `check` do motivo | Done |
| L1–L13, D1–D11, P1–P2, B1–B6, Z | Telas (login real; RPCs da 007 e status simulados) | Lista, paginação, busca, XSS, vazio, 360px, 44px, aviso sem a 007; suspender/reativar/ignorado; tile e card no painel; bloqueio do suspenso com motivo; nada gravado | Review |

**Resultados (2026-11-23):** telas **33/33**; `007` aplicada pelo PO; roteiro SQL **25/26** na primeira rodada (S9b era erro do teste: contagem de referência sob RLS; corrigido no commit `5bcafb5`); ponta a ponta real, só leitura, **19/19** (com a US-020).
