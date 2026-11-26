# Task Breakdown: [US-021] Triagem automática: sinais de suspeita e reanálise de aprovados

**Data:** 2026-11-26
**Participantes:** Bruno Alves
**Estimativa total:** 3 pontos (~6 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (sem erro novo exposto ao app; `solicitar_analise()` continua com 42501)
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (cenários BR17/BR18, revisão manual)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não. As regras estão em `docs/requirements/helpme-mvp-marco2.md` (BR14, BR18, A07) e ficam versionadas em SQL.
- **US exige Contract governado?** Não. Não há API própria; `solicitar_analise()` só ganha o campo `status` na resposta (compatível).
- **Justificativa do Nivel ScrumAIDev:** regra de negócio que tira profissional do diretório público. Nível 1: regra no banco com autoconferência, roteiro SQL manual (NFR11) e BDD de revisão manual.
- **Touch List aplicada:** `supabase/migrations/012_suspeita.sql` (novo), `supabase/testes/012_suspeita.sql` (novo), `supabase/README.md`, `helpme-app/js/telas/admin-analise.js`, `helpme-app/js/telas/admin-profissional.js`, `helpme-app/js/telas/completar-perfil.js`, `helpme-app/assets/css/admin.css`, BDD. A story previa `004_triagem.sql` (nome antigo da 005, já aplicada), por isso a mudança vai na 012.
- **Base da branch:** `feat/US-013-motivo-reenvio` (empilhada). O sinal "já recusado" depende do reenvio da US-013.
- **Banco:** a 012 é aplicada pelo PO no SQL Editor. As expressões da descrição foram conferidas antes no banco real com um SELECT só de leitura (10 exemplos), e a simulação nos cadastros reais não achou falso positivo; o único sinal real é `bruno@test.com` com o número de "Marcos Eletricista" (prof2), cadastro anterior.

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Lista de bloqueio (A07) | `termos_bloqueados()`: `pix antecipado`, `pagamento antecipado`, `deposito antecipado`, `adiantamento`, `renda extra`, `ganhe dinheiro`, `investimento`, `telegram`. Comparação sem acento e por palavra inteira. Editável por SQL (`create or replace`). **Proposta para o PO revisar.** |
| Descrição | Link (`http(s)://`, `www.`, domínio `.com/.br/.net/.me/...`, inclusive `wa.me`), e-mail, 8+ dígitos com até 2 separadores entre eles, termo da lista. "Rua 12, casa 3", horários e valores não disparam (autoconferência). |
| Telefone repetido | Compara os números normalizados (`telefone_br`) de WhatsApp e telefone. **Só marca o cadastro mais novo**: quem já estava no diretório não sai porque copiaram o número dele. A checagem guarda `outro_id` e o nome, e o detalhe do admin tem link para o outro cadastro. |
| Já recusado | Recusa que **nenhuma aprovação posterior** resolveu. Assim, o profissional que reenviou (US-013) é sempre suspeito, mas depois que um admin o aprova o sinal não o persegue nas próximas edições. |
| BR18 | `reavaliar_profissional()`: aprovado cuja triagem ganhou um problema **novo** (código que falha agora e não falhava na triagem anterior) volta para `pendente`. Um sinal que o admin já tinha visto ao aprovar não tira o profissional do diretório a cada edição. Suspenso não é tocado (US-019). |
| Histórico | A volta para `pendente` grava `reenvio` com autor nulo (sistema). A fila e o painel já contam o tempo a partir do último `reenvio`, sem mudar `fila_analise()` nem `painel_admin()`. O motivo é neutro ("Perfil alterado depois da aprovação...") porque o dono lê as próprias linhas (011). |
| Sem depender do front | Trigger `profissionais_reavaliar_aprovado` (AFTER UPDATE dos campos da triagem, só para edição pelo app de um aprovado): quem editar pela API sem chamar `solicitar_analise()` também é reavaliado. `solicitar_analise()` continua cobrindo a mudança de categorias. |
| Sigilo | Sinais de suspeita continuam fora de tudo o que o profissional lê (`solicitar_analise`, `minhas_pendencias`, coluna `checagens` fechada pela 011). Funções internas e a lista de bloqueio sem `execute` para o app. |
| Pendentes já na fila | A 012 retria os pendentes ao ser aplicada, para a fila mostrar os sinais sem esperar novo salvamento. |
| Telas | Fila: card do suspeito com borda e fundo de destaque, caixa do lote desabilitada com rótulo explicando. Detalhe: sinais como "Suspeita —", obrigatórias como "Atenção —", link "Ver o outro cadastro". `completar-perfil`: o aprovado que saiu do diretório vê o aviso (sem revelar o sinal) e o topo vira "em análise". |

---

## Checagem de Principios (condicional)

- [x] Abordagem mais simples: a triagem da 005 é copiada com uma linha a mais (conferida por `diff`); a fila e o painel não mudam porque a volta usa a ação `reenvio` que eles já entendem.
- [x] Sem dependência externa nova (sem `unaccent`: `translate` basta para os termos da lista).
- [x] Touch List respeitada; o trigger é um acréscimo para a BR18 não depender do front (registrado acima).

---

## Tasks Tecnicas

#### [TASK-001] Sinais de suspeita (`012_suspeita.sql` §1–4)
- **Estimativa:** 2,5 h
- **Critério de conclusão:** critérios 1, 2 e 3; autoconferência com os exemplos do critério 2.

#### [TASK-002] Volta para pendente do aprovado com alerta (§5–7)
- **Estimativa:** 2 h
- **Critério de conclusão:** critério 4, inclusive editando pela API sem o front.

#### [TASK-003] Destaque na fila, exclusão do lote e detalhe
- **Estimativa:** 1 h
- **Critério de conclusão:** critérios 1 (nome e link no detalhe), 5, 6 e 7.

#### [TASK-004] Aviso no `completar-perfil` e roteiro SQL
- **Estimativa:** 0,5 h
- **Critério de conclusão:** U0–U8c com "ok" no banco real.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| U0 | Perfil limpo | Verde, `status` na resposta | Done |
| U1a–U1c | Telefone igual ao do prof1 (outro formato) | Suspeito como `em_analise` sem revelar; detalhe com nome e `outro_id`; prof1 (mais antigo) não marcado | Done |
| U2a–U2d | Descrição | Link, telefone e termo → suspeito; "Rua 12, casa 3" → verde | Done |
| U5a–U5b | Fila e lote | Fila mostra suspeito; lote ignora ("Triagem: suspeito") | Done |
| U3a–U3b | Já recusado | Reenvio → suspeito; aprovação posterior resolve | Done |
| U4a–U4h | BR18 | Aprovado edita com link **pela API** → pendente, fora do diretório, reenvio do sistema, cliente conclui a aceita, tela recebe `pendente`; edição limpa e sinal antigo não tiram do diretório; suspenso intocado | Done |
| U8a–U8c | Sigilo | Lista de bloqueio, `reavaliar_profissional` e `checagens_suspeita` fechadas | Done |
| A1–D7, P1–P3 | Telas (login real de admin e prof1; RPCs simuladas; nada gravado) | Destaque e lote na fila (360px), filtro, "Suspeita"/"Atenção"/"OK", link para o outro cadastro, XSS, histórico; aviso BR18 no `completar-perfil` sem revelar o sinal | Done |

**Resultados (2026-11-26):** telas **31/31**; telas da US-013 seguem **42/42**. Regex conferidas no banco real (10/10). `012` aplicada pelo PO com a lista de bloqueio proposta (conferido por leitura: trigger ativo, lista em `termos_bloqueados()`, pendentes retriados sem sinal real). Roteiro 012 **23/23**. Ponta a ponta real do admin, só leitura, **5/5**: fila real sem suspeitos, detalhe real com as 6 obrigatórias e os 6 sinais novos. `bruno@test.com` (aprovado, número do prof2) segue com a triagem anterior à 012 e será reavaliado quando editar o perfil (BR18).
