# Roteiro de testes — Contratacao e chat (US-007 a US-010)

**Objetivo:** dizer exatamente o que precisa passar para cada story mudar de status.
**Ambiente:** Supabase real, projeto `btjjbtjxcbvswgezpwgc`, com a versao atual da `main`.
**Regra:** marque `OK` ou `FALHOU` e anote data e nome de quem executou. Se algo falhar, abra um bug e nao avance o status.

## Regra de status

| Mudanca | O que precisa estar verdadeiro |
|---|---|
| `In Progress` → `Review` | Codigo na branch ou na `main`, teste automatizado passando e todos os testes do **Gate Review** da story em `OK` |
| `Review` → `Done` | Todos os testes do **Gate Done** em `OK`, executados por quem **nao** escreveu o codigo, com code review aprovado e validacao do PO |

## Preparacao

| Item | Como fazer |
|---|---|
| Janela A: cliente | Navegador normal, login com `cliente@helpme.test` |
| Janela B: profissional | Janela anonima, login com `prof1@helpme.test` (aprovado) |
| Janela C: terceiro | Outro perfil do navegador, login com `prof2@helpme.test` (aprovado) |
| Contratacao de teste | Na Janela A, contratar `prof1` pelo perfil. Anote o numero da solicitacao: ele e o `ID` deste roteiro |

Abrir duas abas do mesmo navegador **nao** serve: elas dividem o mesmo login.

---

## US-010 — Chat

### Testes automatizados ja executados (2026-11-06)

| Teste | Resultado | Cobre |
|---|---|---|
| `supabase/testes/us010_chat_rls.sql`, no banco real | 26 de 26 | Criterio 6, BR08, NFR07, horario do servidor, sem editar nem apagar |
| Telas no Chrome com Supabase falso | 45 de 45 | Criterios 1 a 5, 7, 8 e a parte de tela do 6 |

**O que eles nao provam:** que o Realtime entrega a mensagem no ambiente real. So o Gate Review abaixo prova isso.

### Execucao automatizada completa (2026-11-09)

Dois scripts, os dois contra o Supabase real e sem instalar nada (Node 22+, Python 3 e Chrome):

| Script | O que faz | Resultado |
|---|---|---|
| `node supabase/testes/contratacao_api.mjs` | API, RLS, triggers, `contato_contraparte` e entrega do Realtime entre usuarios diferentes (WebSocket nativo) | 60 OK, 1 achado (US7-09), 1 bloqueado (US7-02) |
| `node supabase/testes/contratacao_telas.mjs` | Telas no Chrome headless com logins isolados (cliente, prof1, terceiro), 360px, Tab, contraste AA, offline | 93 de 93 OK |

As contratacoes criadas levam `[TESTE AUTO <data>]` na descricao. Para limpar: `delete from public.contratacoes where descricao like '[TESTE AUTO%';` no SQL Editor.

**Achados:**
- **US7-09 (melhoria, fora dos criterios):** o banco aceita `descricao` e `endereco` vazios ou so com espacos; so o formulario barra. Sugestao: `check (char_length(trim(...)) between 1 and N)` numa migration nova.
- **US7-02 / CT-05:** estava bloqueado porque o `prof3` estava `aprovado`; em 2026-11-09 o Bruno voltou o `prof3` para `pendente` e o teste passou (403 `42501`).

**Continua manual:** CH-13 (por outra pessoa), CH-17 (celular real), leitor de tela no CH-18, CH-20 (BDD), CH-21 (code review por quem nao escreveu) e CH-22 (PO).

### Gate Review

| ID | Criterio | Passos | Resultado esperado | Resultado |
|---|---|---|---|---|
| CH-01 | 2 | Janelas A e B abertas em `contratacao.html?id=ID`. Na A, enviar `teste 1` | Aparece na B em ate 3 segundos, sem recarregar | OK auto 09/11 (UI10-01, 0,65 s; API US10-02) |
| CH-02 | 2 | Na B, responder `teste 2` | Aparece na A em ate 3 segundos, sem recarregar | OK auto 09/11 (UI10-02, 0,53 s) |
| CH-03 | 2 | Enviar 5 mensagens seguidas, alternando A e B | Nenhuma falta, nenhuma duplicada, mesma ordem nas duas janelas | OK auto 09/11 (UI10-03, US10-04) |
| CH-04 | 1 | Recarregar (F5) as duas janelas | Mesmo historico; cada um ve `Você` nas proprias e o nome da outra parte nas demais; horario correto | OK auto 09/11 (UI10-04) |
| CH-05 | 5 | Enviar `<b>oi</b>` | As duas janelas mostram o texto literal, sem negrito | OK auto 09/11 (UI10-05) |
| CH-06 | 3 | Campo vazio; depois so espacos; depois colar 1001 caracteres | `Enviar` desabilitado nos tres casos; o contador mostra `1001/1000` e o aviso de texto longo | OK auto 09/11 (UI10-06, UI10-07) |
| CH-07 | 3 | Apagar 1 caractere (1000) e enviar | Mensagem enviada; contador volta a `0/1000` | OK auto 09/11 (UI10-08) |
| CH-08 | 4 | Com A e B abertas no chat, aceitar a contratacao e marcar como concluida em outra aba | O campo desabilita nas duas janelas sem recarregar; historico continua visivel | OK auto 09/11 (UI10-16, UI10-17) |

### Gate Done

| ID | Criterio | Passos | Resultado esperado | Resultado |
|---|---|---|---|---|
| CH-09 | 4 | Abrir o chat de uma contratacao `cancelada` e de uma `recusada`, como cliente e como profissional | Campo desabilitado, aviso de encerrada e historico visivel | OK auto 09/11 (UI10-18, 4 combinacoes) |
| CH-10 | D9 | Na B, em `contratacoes.html`, abrir `Conversar` em uma `solicitada` e `Ver conversa` em uma `recusada` | As duas abrem o chat; `Voltar` leva para a lista | OK auto 09/11 (UI10-19, UI10-20) |
| CH-11 | 6 | Na C, abrir `contratacao.html?id=ID` | Mostra "Contratacao nao encontrada" e nenhuma mensagem | OK auto 09/11 (UI10-14) |
| CH-12 | 6 | Na C, rodar o bloco de console abaixo | `select` devolve `[]`; `insert` devolve erro `42501` | OK auto 09/11 (UI10-15, no console do Chrome do terceiro) |
| CH-13 | 6 | Outra pessoa roda `supabase/testes/us010_chat_rls.sql` no SQL Editor | Ultima linha: `26 passaram, 0 falharam` | Pendente (pessoa que nao escreveu o codigo) |
| CH-14 | Erro | Na A, DevTools > Network > Offline, digitar e enviar | Aviso de sem conexao; o texto continua no campo | OK auto 09/11 (UI10-10) |
| CH-15 | NFR07 | Voltar para Online e enviar pela B enquanto a A reconecta | A mensagem aparece na A; se nao chegar pelo Realtime, aparece ao trocar de aba e voltar | OK auto 09/11 (UI10-11, chegou pelo Realtime) |
| CH-16 | 7 | DevTools em 360px, com uma mensagem longa sem espacos | Sem rolagem horizontal; botoes com pelo menos 44px | OK auto 09/11 (UI10-12, UI10-M1, UI10-M2) |
| CH-17 | 7 | Celular real: abrir o teclado e enviar | Campo e botao continuam acessiveis | Pendente (celular real) |
| CH-18 | 8 | So com o teclado: Tab ate a lista, campo e `Enviar`; Enter envia; Shift+Enter quebra linha | Foco visivel em cada item; label `Sua mensagem` lido pelo leitor de tela | Parcial: OK auto 09/11 Tab, foco, Enter, Shift+Enter e label (UI10-09, UI10-13, UI10-A2); falta leitor de tela |
| CH-19 | 9 | Buscar `service_role` e dados fixos em `helpme-app/` | Nenhum resultado | OK auto 09/11 (NFR01-1 a 3: so chave anon; a palavra aparece apenas num comentario de supabase-config.js) |
| CH-20 | DoD | Revisar `docs/bdd/contratacao.feature`, cenarios de BR08 e NFR07 | Todos conferidos e registrados | Pendente |
| CH-21 | DoD | Code review por quem nao escreveu | Aprovado; como ha `Behavior change`, solicitar segundo revisor | Pendente |
| CH-22 | DoD | Validacao do PO | Aprovada | Pendente |

Bloco de console para o CH-12, com `ID` trocado pelo numero real:

```js
const ID = 0; // numero da contratacao
const { data: { user } } = await supabaseClient.auth.getUser();
console.log(await supabaseClient.from('mensagens').select('*').eq('contratacao_id', ID));
console.log(await supabaseClient.from('mensagens').insert({ contratacao_id: ID, autor_id: user.id, conteudo: 'invasao' }));
```

---

## US-007 a US-009 — Gate Done

Essas stories ja estao em `Review`. Use contratacoes novas, com as mesmas janelas.

### US-007 — Contratar pelo perfil

| ID | Criterio | Passos | Resultado esperado | Resultado |
|---|---|---|---|---|
| CT-01 | 1 | Abrir o perfil do `prof1` como visitante, cliente e profissional | `Contratar` aparece para visitante e cliente; nao aparece para profissional | OK auto 09/11 (UI7-01, UI7-02) |
| CT-02 | 2 | Como visitante, clicar em `Contratar` e entrar como cliente | Volta para `solicitar-pedido.html` do mesmo profissional | OK auto 09/11 (UI7-03, UI7-04) |
| CT-03 | 3 | Enviar sem descricao, sem endereco, sem data e com data no passado | Cada caso mostra erro no campo e nada e criado | OK auto 09/11 (UI7-06 a UI7-09) |
| CT-04 | 4 | Enviar o formulario completo | Cria a contratacao `solicitada` e abre `espera-cliente.html?id=` | OK auto 09/11 (UI7-10 a UI7-12) |
| CT-05 | 5 | Rodar os blocos 2.4 de `supabase/README.md` | Banco recusa profissional pendente e data no passado | OK auto 09/11: data no passado (US7-03) e profissional pendente (US7-02, rodado depois de o prof3 voltar para pendente: 403 `42501`, nada gravado) |
| CT-06 | 5 | Logado como profissional, tentar `insert` em `contratacoes` pelo console | Erro do banco | OK auto 09/11 (US7-04) |

### US-008 — Aceitar ou recusar

| ID | Criterio | Passos | Resultado esperado | Resultado |
|---|---|---|---|---|
| AC-01 | 1 | Na B, abrir `contratacoes.html` | Lista agrupada por status, com descricao, endereco e data | OK auto 09/11 (UI8-01, UI8-02) |
| AC-02 | 3 | Com a B aberta, criar uma contratacao na A | Aparece na B sem recarregar | OK auto 09/11 (UI8-04, 1,5 s) |
| AC-03 | 2 | Aceitar uma e recusar outra | Status muda e os cards trocam de grupo | OK auto 09/11 (UI8-05, UI8-06) |
| AC-04 | 4 | Abrir a lista na B, cancelar na A e, antes da lista atualizar, clicar `Aceitar` (se preciso, deixar a B offline ate o clique) | Aviso de solicitacao cancelada e lista recarregada | OK auto 09/11 (UI8-07 a UI8-09) |
| AC-05 | 5 | Na C, tentar aceitar pelo console uma contratacao do `prof1` | Nenhuma linha alterada ou erro | OK auto 09/11 (US8-04) |
| AC-06 | 5 | Na B, tentar pular de `solicitada` para `concluida` pelo console | Erro `transicao de status invalida` | OK auto 09/11 (US8-06) |
| AC-07 | 6 | Procurar o link `Editar meu perfil` | Existe e funciona | OK auto 09/11 (UI8-03) |

### US-009 — Acompanhar, cancelar e concluir

| ID | Criterio | Passos | Resultado esperado | Resultado |
|---|---|---|---|---|
| AP-01 | 1 | Na A, deixar `contratacoes.html` aberta e aceitar na B | Status muda sem recarregar | OK auto 09/11 (UI9-06, 1 s) |
| AP-02 | 2 | Na A, deixar `espera-cliente.html?id=` aberta e aceitar na B | Vai sozinha para `servico-andamento.html?id=` | OK auto 09/11 (UI9-01) |
| AP-03 | 3 | Cancelar uma `solicitada` | Status `cancelada`; botao some | OK auto 09/11 (UI9-08) |
| AP-04 | 4 | Antes do aceite, conferir o que a B ve do cliente | So o primeiro nome, sem telefone | OK auto 09/11 (UI9-03; API US9-07) |
| AP-05 | 4 | Depois do aceite, conferir as duas telas | Nome, Ligar e WhatsApp corretos para as duas partes | OK auto 09/11 (UI9-02, UI9-04) |
| AP-06 | 5 | Concluir em uma parte com as duas abertas | As duas atualizam e nao ha mais acoes | OK auto 09/11 (UI9-11) |
| AP-07 | 6 | Na C, abrir `espera-cliente.html?id=` e `servico-andamento.html?id=` | "Contratacao nao encontrada" | OK auto 09/11 (UI9-09) |
| AP-08 | Comum | Repetir 360px e navegacao por Tab em `contratacoes.html`, `espera-cliente.html` e `servico-andamento.html` | Sem rolagem horizontal; foco visivel | OK auto 09/11 (UI9e/UI9s/UI9l M1, M2, A2) |

---

## Registro de execucao

| Data | Quem executou | Testes | Bugs abertos |
|---|---|---|---|
| 2026-11-06 | Agente (SQL no banco real, com rollback) | `us010_chat_rls.sql`: 26 de 26 | Nenhum |
| 2026-11-06 | Bruno Alves (PO) | Testes proprios do chat; US-010 movida para `Review` por decisao do PO. CH-01 a CH-08 sem resultado individual: refazer CH-05 e CH-07 junto do Gate Done, porque nao ha rastro deles no banco | Nenhum informado |
| 2026-11-09 | Agente (scripts automatizados no banco e no Chrome reais) | `contratacao_api.mjs` 60/62 e `contratacao_telas.mjs` 93/93; resultados na coluna de cada teste | Nenhum bug; 1 melhoria (US7-09) e 1 bloqueio de ambiente (prof3 aprovado) |
| 2026-11-09 | Bruno Alves (PO) | US-007 a US-010 movidas para `Done` por decisao do PO para a entrega do Marco 2. Nao executados: CH-13 (RLS rodado por outra pessoa), CH-17 (celular real), leitor de tela (CH-18), CH-20 (revisao do BDD), CH-21 (code review por quem nao escreveu) e CH-22 (validacao formal do PO) | Nenhum |
| | | | |
