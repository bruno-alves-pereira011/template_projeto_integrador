# Requirements — Marco 3: orçamento da contratação e avaliação do profissional

**Status:** DRAFT
**Discovery de origem:** `docs/discovery/helpme-marco3-orcamento-avaliacao.md` (PROBLEM_READY em 2026-11-27)
**Classificacao de Processo:** NORMAL PROCESS
**Numeração:** continua a de `docs/requirements/helpme-mvp-marco2.md` (último FR26, BR22, NFR11, A09) para as stories citarem IDs únicos no projeto.

## Intent Summary
O cliente sabe e aprova o preço dentro do app antes de o serviço ser concluído, e só quem teve um serviço concluído avalia o profissional, para que a nota do perfil público seja confiável.

## Functional Requirements

### Orçamento
- **FR27** — Em uma contratação `aceita` sem valor aprovado e sem valor aguardando resposta, o **profissional** envia um orçamento: valor em reais e observação opcional (o que está incluso).
- **FR28** — O **cliente** vê o valor proposto e a observação na tela da contratação e **aprova** ou **recusa**.
- **FR29** — Depois de uma recusa, o profissional pode enviar um novo valor (FR27 de novo), sem limite de tentativas.
- **FR30** — As duas partes veem o histórico de orçamentos da contratação: valor, observação, data de envio, resposta e data da resposta.
- **FR31** — Enquanto não houver valor aprovado, o **cliente** pode cancelar a contratação `aceita`.
- **FR32** — A lista "Minhas contratações" mostra, para contratações aceitas, a situação do orçamento: "Aguardando valor", "Valor para aprovar" / "Aguardando o cliente" e "Valor aprovado: R$ X".

### Avaliação (HU04)
- **FR33** — O **cliente** de uma contratação `concluida` avalia o profissional dela: nota de 1 a 5 e comentário opcional.
- **FR34** — O cliente edita a própria avaliação daquele profissional (nota e comentário) depois de enviada.
- **FR35** — O perfil público do profissional lista as avaliações: nota, comentário, **primeiro nome** do autor e data, das mais recentes para as mais antigas. A média e o total (FR03) continuam no topo do perfil.

## Business / Domain Rules
- **BR23** — Substitui parcialmente a BR06. Transições da contratação:
  - `solicitada → aceita | recusada` (só o profissional contratado, como hoje);
  - `solicitada → cancelada` (só o cliente, como hoje);
  - **novo:** `aceita → cancelada` (só o cliente, e só sem orçamento aprovado);
  - `aceita → concluida` (qualquer das partes, **só com orçamento aprovado**).
- **BR24** — Uma contratação tem no máximo **um orçamento aguardando resposta** por vez e no máximo **um aprovado**. Depois do aprovado, nenhum outro é enviado e o aprovado não é alterado nem apagado.
- **BR25** — Só o profissional da contratação envia orçamento e só o cliente da contratação responde. Ninguém altera valor ou observação depois do envio; o orçamento só muda de "aguardando" para "aprovado" ou "recusado".
- **BR26** — Valor entre **R$ 1,00 e R$ 100.000,00**, com centavos. Observação até 200 caracteres.
- **BR27** — Só avalia o **cliente** que tem pelo menos uma contratação `concluida` com aquele profissional. Uma avaliação por cliente e profissional (regra que já existe); nota de 1 a 5; comentário até 500 caracteres (014). Vale no banco, não só na tela.
- **BR28** — O autor não apaga a avaliação pelo app (decisão proposta: a nota do perfil não "some" depois de um conflito). Profissional e admin não editam nem apagam avaliações.
- **BR29** — Nenhuma avaliação no banco fica sem contratação concluída entre as partes: a migration apaga a avaliação do seed que não cumpre a BR27 (decisão do PO, 2026-11-27).

## Non-Functional Requirements
- **NFR12** — Valor guardado em **centavos inteiros** (sem ponto flutuante) e exibido em reais no formato brasileiro (`R$ 1.234,50`).
- **NFR13** — Regras BR23 a BR29 no banco (RLS, trigger ou função `security definer` com `search_path` fixo), com roteiro em `supabase/testes/` que se desfaz sozinho, como os da 003 à 014.
- **NFR14** — Os testes da contratação da Sprint 02 (`contratacao_api.mjs`, `contratacao_telas.mjs`) são atualizados para a regra nova de conclusão e voltam a passar.
- **NFR15** — O nome do autor na lista pública sai por função ou view que devolve só o **primeiro nome**; nenhum outro dado do cliente fica legível ao visitante (mesmo cuidado da 014).
- Valem para todas as telas: **NFR01** (RLS e anon key), **NFR03** (stack sem build), **NFR04** (360px), **NFR05** (acessibilidade) e texto do banco sempre por `textContent`.

## User Scenarios

### Main flow — orçamento
1. O profissional aceita a solicitação (como hoje).
2. Em "Serviço em andamento", o profissional vê "Enviar orçamento", digita o valor e a observação e envia.
3. O cliente abre a mesma contratação e vê "Valor proposto: R$ 350,00 — Inclui material". Toca "Aprovar".
4. As duas telas passam a mostrar "Valor aprovado: R$ 350,00". O botão "Concluir serviço" fica disponível.
5. Uma das partes conclui (como hoje).

### Main flow — avaliação
1. Com a contratação concluída, o cliente vê "Avaliar profissional" na contratação e em "Minhas contratações".
2. Escolhe a nota (1 a 5), escreve um comentário opcional e envia.
3. O perfil público passa a mostrar o comentário com o primeiro nome e a data; média e total são atualizados.
4. Se o cliente voltar, vê a própria avaliação e pode editar.

### Alternative / Error / Edge cases
- O cliente **recusa** o valor: o profissional vê "Valor recusado" e pode enviar outro; o histórico mostra os dois.
- O cliente **cancela** antes de aprovar: a contratação vai para `cancelada`; o profissional vê "Cancelada pelo cliente".
- Tentar **concluir sem valor aprovado** (tela antiga, console ou API): o banco recusa com mensagem clara.
- Valor **vazio, zero, negativo, com letras** ou acima do limite: erro no campo, nada enviado.
- **Duplo clique** em "Enviar orçamento", "Aprovar" ou "Enviar avaliação": um envio só.
- O profissional tenta enviar com um valor **aguardando resposta**: o banco recusa (BR24).
- O cliente responde a um orçamento que **já foi respondido** (outra aba): o banco recusa; a tela recarrega e mostra o estado atual.
- Alguém tenta **avaliar sem contratação concluída** (pela API): recusado (BR27).
- Cliente com **duas contratações concluídas** com o mesmo profissional: continua com uma avaliação só, que ele edita.
- A contratação `aceita` que já existia **sem orçamento** (1 no banco real): segue a regra nova; para concluir, precisa de valor aprovado.

## Business / Domain Context
- HU04 do README (avaliar profissional) e o item "orçamento: profissional envia valor, cliente aprova" do Marco 3 (`docs/discovery/helpme-mvp-marco2.md`).
- Pagamento continua fora do app (BR04); o orçamento só registra o valor combinado.
- Item 5 da banca de 2026-11-26 (avaliar sem ter contratado) é fechado pela BR27.

## Technical Context & Constraints
- Próxima migration livre: `015_*`; aplicada pelo PO no SQL Editor (DDL e escrita são do PO).
- A transição de status fica no trigger `validar_contratacao` (001): a BR23 altera esse trigger em migration nova, sem editar a 001 (DEBT-008).
- Tabela nova de orçamentos com RLS no mesmo script (NFR08): lê só quem é parte da contratação; admin não lê pela tabela (padrão da BR21).
- `avaliacoes` já existe, com políticas `leitura publica`, `autor cria`, `autor edita` e `autor apaga` (001): `autor cria` e `autor edita` ganham a condição da BR27; `autor apaga` sai (BR28).
- O visitante não lê o nome de clientes em `usuarios` (014): a lista pública de avaliações precisa de função própria (NFR15).
- Telas candidatas: `servico-andamento.html` (orçamento e conclusão), `contratacoes.html` (situação e "Avaliar"), `profissional.html` (lista de avaliações) e um bloco ou tela de avaliação na contratação concluída.

## Quality Attributes
- **Segurança:** regras no banco; nada de valor ou nota decidido só pela tela.
- **Testabilidade:** roteiro SQL da 015 cobrindo BR23 a BR29; testes de tela no navegador sem gravar dados.
- **Confiabilidade:** respostas concorrentes (duas abas) resolvidas pelo banco, como na fila do admin.

## Assumptions
- **A10** — Um orçamento vale para o serviço inteiro (sem itens nem parcelas) e não tem prazo de validade.
- **A11** — A lista pública mostra até 20 avaliações, mais recentes primeiro (sem paginação neste momento).
- **A12** — Sem notificação: a outra parte vê a mudança pela atualização que as telas de contratação já fazem.

## Out of Scope
- Pagamento real ou simulado; favoritos; profissional avaliar cliente; contraproposta do cliente; resposta do profissional a uma avaliação; moderação e denúncia; valor do orçamento no admin e nos indicadores (todos no LATER/OUT do Discovery).

## Open Questions
- [BLOCKING? não] **BR28 — apagar avaliação:** a proposta é o autor **não** apagar (só editar). Hoje o banco deixa apagar. Confirma tirar essa opção?
- [BLOCKING? não] **Profissional cancelar depois do aceite:** não está no escopo (só o cliente cancela, FR31). Se o profissional desistir, ele usa o chat e o cliente cancela. Confirma?

## Key Decisions Proposed
- **Sem status novo em `contratacoes`:** a contratação continua `aceita` durante o orçamento; a situação do orçamento vem da tabela nova. Assim as telas e regras atuais (contato liberado no aceite, BR07; chat) não mudam.
- **Tabela própria de orçamentos** (histórico, FR30) em vez de colunas na contratação.
- **Respostas por função no banco** (aprovar/recusar), não por update livre na tabela, para garantir BR24/BR25 e a corrida entre abas.
- **Centavos inteiros** para o valor (NFR12).
- **Avaliação do seed apagada** na migration (BR29).

## Review & Adjust

O usuario pode **aprovar, editar, adicionar, remover ou reclassificar** qualquer requisito/regra antes do gate.

- [ ] Proposta completa apresentada ao usuario
- [ ] Ajustes solicitados incorporados
- [ ] IDs estabilizados depois da revisao
- [ ] Nenhuma pergunta bloqueante aberta

### User adjustments
- ...

## Gate G1 — REQUIREMENTS READY

**Status:** PENDING

**Aprovado pelo usuario:** nao
