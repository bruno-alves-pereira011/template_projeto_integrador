# Task Breakdown: [US-016] Triagem automática: checagens obrigatórias

**Data:** 2026-11-13
**Participantes:** Bruno Alves
**Estimativa total:** 5 pontos (~7 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (falha da triagem não desfaz o salvamento; detalhe só no console)
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual — BR12, BR13)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** regra de negócio observável (BR13) e controle de acesso no banco, versionados em `005_triagem.sql` e cobertos por `supabase/testes/005_triagem.sql` (NFR11).
- **Touch List aplicável:** `supabase/migrations/005_triagem.sql` (novo), `supabase/testes/005_triagem.sql` (novo), `helpme-app/js/completar-perfil.js`, `supabase/README.md`, `docs/bdd/aprovacao_profissionais.feature` (cabeçalho).
- **Desvios da story:**
  - A story previa `004_triagem.sql`. O número 004 ficou com a fila da US-015 (já aplicada), então a triagem vai na `005_triagem.sql` (D7).
  - A coluna `categorias.ativa` estava prevista para a US-018. A BR13 conta só categoria **ativa**, então a coluna entra aqui com `default true` (todas continuam ativas). A tela que desativa/reativa continua na US-018.
- **Base da branch:** `feat/US-015-fila-analise` (usa `analises_profissional` e a fila da 004, ainda fora da `main`).
- **Runner BDD / contrato / mock:** N/A (revisão manual).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Onde roda | `solicitar_analise()` (`security definer`), chamada pelo `completar-perfil.js` depois de gravar perfil **e** categorias. Um trigger em `profissionais` rodaria antes das categorias existirem. |
| Função interna | `triar_profissional(id)` faz as checagens e grava. Ninguém do app executa direto: `revoke` de `public`, `anon` e `authenticated`. A US-021 acrescenta nela as checagens do tipo `suspeita`. |
| Telefone | `telefone_br(texto)`: mesma normalização do `js/telefone.js` (tira não-dígitos e o 55) + DDD da lista da Anatel + celular de 11 dígitos começando com 9. Basta WhatsApp **ou** telefone válido (BR13). |
| E-mail confirmado (A06) | `auth.users.email_confirmed_at is not null`. Com a confirmação desligada o Supabase já preenche esse campo, então a checagem passa sozinha. |
| Histórico | Só grava nova linha se o resultado ou as checagens mudaram. Salvar sem mudar nada não enche o histórico. |
| Status | A triagem nunca muda `status_aprovacao` (BR12). A volta do aprovado para `pendente` (BR18) é da US-021. |
| O que volta para o profissional | `{resultado, pendencias}`: só as mensagens das checagens **obrigatórias** que falharam. Sinais de suspeita (US-021) não são revelados: o resultado `suspeito` volta como `em_analise`. |
| Na tela | Na edição, pendências aparecem na mensagem ("Perfil salvo. Ainda falta corrigir: …"). No primeiro cadastro o profissional vai para `bloqueio.html`, onde a US-013 mostra os motivos. |
| Falha da triagem | Não desfaz o salvamento nem vira erro na tela; o admin vê "Sem triagem" e o próximo salvamento tenta de novo. |
| Cadastros antigos | A migration faz a triagem inicial dos pendentes que ainda não têm nenhuma. |

---

## Checagem de Principios (condicional)

Aplicável (Nível 1 e `Behavior change` = YES).

- [x] Abordagem mais simples: uma função de checagem, uma de entrada e um utilitário de telefone; uma chamada no front.
- [x] Sem dependência nova.
- [x] Touch List respeitada, com os desvios registrados acima.

---

## Tasks Tecnicas

### Database Tasks

#### [TASK-001] `solicitar_analise()`, `triar_profissional()` e `telefone_br()` (`005_triagem.sql`)
- **Estimativa:** 3 h
- **Critério de conclusão:** critérios 1, 3, 4 e 6; autoconferência no fim do script.

#### [TASK-003] Roteiro `supabase/testes/005_triagem.sql`
- **Estimativa:** 1,5 h
- **Critério de conclusão:** T1–T9 com "ok" no banco real.

### Frontend Tasks

#### [TASK-002] Chamada no `completar-perfil.js`
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 2; pendências na mensagem; falha não desfaz o salvamento.

### Testing Tasks

#### [TASK-004] Testes de tela e ponta a ponta
- **Estimativa:** 1,5 h
- **Critério de conclusão:** roteiro abaixo; depois da 005 aplicada, fila real com o resultado da triagem.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| T1a–T1b | `telefone_br` | Formatos com/sem 55 e fixo aceitos; DDD 00/20, celular sem 9, sem DDD e vazio recusados | Done |
| T2–T3 | Perfil completo | `verde`; 6 checagens gravadas | Done |
| T4 | Status depois da triagem | Continua `pendente` (BR12) | Done |
| T5 | Salvar 2× sem mudar nada | Nenhuma linha nova | Done |
| T6a–T6h | Descrição curta / corrigida / bairro vazio / DDD 00 / fixo válido / categoria desativada / e-mail não confirmado / duas falhas | Pendência com o motivo certo; corrigida volta a verde | Done |
| T7a–T7c | Fila e lote | Fila mostra `pendencia` com os motivos; pendência fica fora do lote; verde entra | Done |
| T8a–T8d | Segurança | Insert direto, função interna, cliente e visitante recusados (critério 6) | Done |
| T9 | Aprovado salva o perfil | Triagem registrada, continua `aprovado` | Done |
| U1–U9 | `completar-perfil` (login real do prof1, gravações e RPC interceptadas) | Pendências na mensagem informativa; ordem perfil → triagem; verde = sucesso; PGRST202 e rede não viram erro; 360px; sem erro de JS; nada escrito no banco | Review |

**Resultados (2026-11-13):** telas **9/9**. Roteiro SQL e ponta a ponta aguardando a `005` ser aplicada pelo PO.

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-003 → TASK-002 → aplicar `005` → TASK-004 (ponta a ponta).
