# Task Breakdown: [US-013] Motivo da pendência/recusa e reenvio para análise

**Data:** 2026-11-26
**Participantes:** Bruno Alves
**Estimativa total:** 3 pontos (~5 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (errcode 42501 / 22023, traduzidos em `js/telas/bloqueio.js`)
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (cenários FR21/BR17, revisão manual)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. As regras estão em `docs/requirements/helpme-mvp-marco2.md` (FR21, BR17) e ficam versionadas em SQL.
- **US exige Contract governado?** Não. Não há API própria; o boundary é o PostgREST/RPC do Supabase, protegido por RLS e `security definer`.
- **Justificativa do Nivel ScrumAIDev:** o profissional muda o próprio status de aprovação pelo app (reenvio) e passa a ver um dado de decisão do admin. Nível 1 basta: regra no banco, roteiro SQL manual (NFR11) e BDD de revisão manual. Não há runner para subir de nível.
- **Touch List aplicada:** `supabase/migrations/010_reenvio.sql` (novo), `supabase/testes/010_reenvio.sql` (novo), `supabase/README.md`, `helpme-app/bloqueio.html`, `helpme-app/js/telas/bloqueio.js`, `helpme-app/js/telas/completar-perfil.js` (aviso e lembrete do recusado), `helpme-app/assets/css/auth.css` (caixa de pendências), BDD.
- **Desvio da Touch List da story:** a story previa uma política de SELECT do dono em `analises_profissional` dentro da `003_admin.sql`. As duas coisas mudaram depois que ela foi escrita: (1) a 003 já está aplicada, então a mudança vai numa migration nova (010); (2) a 004 fechou a tabela de propósito (sem políticas; a autoconferência dela falha se houver alguma). Uma política liberaria a linha inteira, com checagens de suspeita e `autor_id` do admin, o que contraria o critério 5. Por isso a leitura é por funções que devolvem só o necessário.
- **Base da branch:** `fix/DEBT-009-navegacao-por-papel` (empilhada). A US-013 usa a `minha_ultima_decisao()` da 007 (US-019), e a US-019, a US-020 e o DEBT-009 ainda não estão na `main`. Fazer o merge depois deles.
- **Banco:** a 010 precisa ser aplicada pelo PO no SQL Editor (o MCP recusa DDL). Ela confere sozinha se a 005 e a 007 existem.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Motivo da recusa | Reaproveita `minha_ultima_decisao()` (007), que já devolve `acao`, `motivo` e data da última decisão do próprio cadastro. Sem função nova. |
| Pendências | `minhas_pendencias()`: só leitura, só as mensagens das checagens **obrigatórias** que falharam na última triagem gravada. Não roda a triagem de novo, então a tela mostra o mesmo que o admin vê na fila. Sinais de suspeita (US-021) nunca saem. Aparece no pendente e no recusado (FR21). |
| Reenvio | `reenviar_para_analise()`: trava a linha, só age se o status for `recusado`; senão dá erro 22023 e nada muda. Volta a `pendente`, grava `reenvio` no histórico com `autor_id` = o profissional e roda `triar_profissional()` (BR17). Devolve `{status, pendencias}` como a `solicitar_analise()`. |
| Reenvio com pendências | Permitido, como na story: o cadastro novo também entra na fila com pendência, e o admin não aprova em lote quem não está verde (BR15). A tela mostra as pendências logo após o reenvio. |
| Suspenso | Não reenvia (US-019: só o admin reativa). A função recusa e a tela não mostra o botão. |
| Tela | Recusado: motivo + data, pendências, "Corrigir meu perfil", "Reenviar para análise". Depois do reenvio a página recarrega no painel "em análise" com a confirmação e o foco nela. Pendente: pendências e link "Corrigir meu perfil" (ou "Editar meu perfil", sem pendências). Se a leitura de motivo/pendências falhar, o painel aparece sem eles. |
| `completar-perfil` | O aviso do recusado deixa de mandar "falar com a equipe" e aponta para o reenvio. Ao salvar como recusado, a mensagem lembra que salvar não reabre a análise. |
| Erros | Sem conexão, 22023 (o status mudou: a tela recarrega na situação real) e 42501 com textos próprios; o resto, mensagem genérica. Detalhes só no console. |
| Impacto na US-021 | O sinal "já recusado" (BR14) entra na `triar_profissional()` olhando o histórico (`recusa` seguida de `reenvio`). O passo "a triagem registra suspeito" do cenário de reenvio do BDD depende dela. |

---

## Checagem de Principios (condicional)

- [x] Abordagem mais simples: duas funções pequenas e reaproveitamento da `minha_ultima_decisao()`; nenhuma tabela ou coluna nova.
- [x] Sem dependência externa nova.
- [x] Touch List respeitada, com o desvio acima registrado (política → funções; 003 → 010).

---

## Tasks Tecnicas

#### [TASK-001] `010_reenvio.sql` + roteiro `supabase/testes/010_reenvio.sql`
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 1, 2, 4, 5 e 8 no banco; R1–R16 com "ok" no banco real.

#### [TASK-002] Motivo e pendências em `bloqueio.html`
- **Estimativa:** 1,5 h
- **Critério de conclusão:** critérios 1, 2, 3, 6 e 7.

#### [TASK-003] Botão "Reenviar para análise"
- **Estimativa:** 1 h
- **Critério de conclusão:** critério 4 na tela; erro de rede e status já mudado tratados.

#### [TASK-004] Aviso e lembrete do recusado em `completar-perfil`
- **Estimativa:** 0,5 h
- **Critério de conclusão:** o recusado não é mais mandado "falar com a equipe".

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| R1–R2 | Visitante e cliente chamam o reenvio | Sem permissão (critério 8) | Review |
| R3–R5 | Pendente e suspenso chamam o reenvio | Erro 22023; nada muda, sem linha no histórico (critério 4) | Review |
| R6–R7 | Admin recusa com motivo | Profissional lê o motivo pela `minha_ultima_decisao()` (critério 1) | Review |
| R8 | Pendências | Profissional lê a pendência da descrição (critério 2) | Review |
| R9–R11 | Reenvio | Volta a `pendente` com as pendências; `reenvio` no histórico com o profissional como autor; segundo reenvio recusado (critério 4) | Review |
| R12–R13 | Admin | De volta à fila desde o reenvio; detalhe mostra o reenvio com o nome | Review |
| R14–R16 | Privacidade | Tabela fechada; prof1 não lê a recusa do prof3; sinal de suspeita não chega ao profissional (critério 5) | Review |
| B1–B8 | Telas (login real do prof3; status e RPCs da 010 simulados; nada gravado) | Motivo com data e como texto (XSS), pendências, links, reenvio com sucesso / sem rede / status já mudado, sem a 010, suspenso intacto, 360px, 44px, foco visível, aviso e lembrete em `completar-perfil` | Done |

**Resultados (2026-11-26):** telas **39/39** (Playwright + Edge, script no scratchpad da sessão). Roteiro SQL: aguardando a aplicação da 010 pelo PO.
