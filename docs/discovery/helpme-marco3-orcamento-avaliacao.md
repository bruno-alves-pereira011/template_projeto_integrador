# Discovery — Marco 3: orçamento da contratação e avaliação do profissional

**Status:** PROBLEM_READY
**Classificacao de Processo:** NORMAL PROCESS (aprovada pelo PO em 2026-11-27)
**Origem:** híbrido (pedido do PO + Discovery do Marco 2 + código e banco atuais)
**Iniciativa:** EPIC-005 (parte). Escopo aprovado no C0: **orçamento + avaliação**; orçamento **depois do aceite**.

## Intent
Fechar o ciclo da contratação dentro do app: o cliente sabe quanto vai pagar antes de o serviço começar, e depois do serviço deixa uma avaliação que ajuda os próximos clientes a escolher. É o que o Marco 2 deixou para o Marco 3 (HU04 e "orçamento: profissional envia valor, cliente aprova").

## Problem
- Hoje o preço é combinado fora do app (chat ou WhatsApp). Nada registra o valor que as duas partes aceitaram, e o cliente não tem um momento claro de "concordo com esse preço".
- O perfil público já mostra média de notas e total de avaliações (FR03), mas não há como avaliar pelo app. As avaliações que aparecem são as do seed.
- Pela API, qualquer usuário logado pode avaliar qualquer profissional aprovado sem nunca ter contratado (política `avaliacoes: autor cria`, `001_schema.sql:614`, item 5 da banca de 2026-11-26). A nota publicada não é confiável.

## Users / Stakeholders relevantes
- **Cliente:** recebe o valor, aprova ou recusa; avalia depois do serviço.
- **Profissional:** envia o valor depois de aceitar; é avaliado e tem a reputação exposta no perfil público.
- **Visitante:** lê média, total e comentários no perfil para decidir quem contratar.
- **Administrador:** hoje só consulta contratações (US-020, sem chat). Não participa do orçamento nem da avaliação nesta iniciativa.
- **Avaliadores da disciplina:** cobram regra no banco (RLS/trigger) e rastreabilidade HU × tela × tabela.

## Current Situation
- Contratação: `solicitada → aceita | recusada | cancelada`; `aceita → concluida` (cliente ou profissional). O cliente só cancela enquanto está `solicitada`. Contato (telefone) liberado depois do aceite (BR07). Regras no trigger `validar_contratacao` (001).
- Não existe coluna nem tabela de valor.
- `avaliacoes` já existe: `nota` 1–5, `comentario` até 500 (014), único por (usuário, profissional), sem autoavaliação. Leitura pública. Escrita aberta a qualquer logado.
- `profissionais_publicos` calcula `media_notas` e `total_avaliacoes`.
- Banco real (leitura em 2026-11-27): 2 `solicitada`, 1 `aceita`, 2 `concluida`, 5 `recusada`; 2 avaliações, 1 delas sem contratação concluída entre as partes (seed).

## Desired Outcome
- Toda contratação aceita passa por um valor enviado pelo profissional e aprovado pelo cliente antes de poder ser concluída; o valor aprovado fica registrado.
- Só quem contratou e teve o serviço concluído avalia aquele profissional, e a nota do perfil passa a refletir só esses casos.

## Success Criteria
- O cliente vê o valor proposto em reais na tela da contratação e aprova ou recusa com um toque; o profissional vê a resposta sem recarregar a página manualmente (mesma atualização das telas atuais).
- Nenhuma contratação chega a `concluida` sem orçamento aprovado (garantido no banco, com roteiro SQL).
- Pela API, um usuário sem contratação concluída com o profissional não consegue criar avaliação (roteiro SQL).
- O cliente avalia (1–5 + comentário opcional) a partir da contratação concluída; a média e o total do perfil público mudam.
- Critérios comuns do projeto: 360px, toque de 44px, acessibilidade, `textContent` para texto vindo do banco.

## Scope

### IN
- **Orçamento:**
  - depois do aceite, o profissional envia um valor em R$ e, opcionalmente, uma observação curta (o que está incluso);
  - o cliente aprova ou recusa;
  - **[DECIDIDO]** se o cliente recusar, o profissional pode enviar um novo valor; enquanto não houver valor aprovado, o cliente pode **cancelar** a contratação (transição nova `aceita → cancelada`, só do cliente);
  - a conclusão do serviço só é possível com valor aprovado;
  - as duas partes veem o histórico de valores enviados e respostas da contratação.
- **Avaliação (HU04):**
  - **[DECIDIDO]** só o **cliente** de uma contratação **concluída** avalia aquele profissional;
  - uma avaliação por cliente e profissional (regra que já existe); o cliente pode **editar** a própria nota e comentário depois;
  - o **comentário aparece no perfil público**, com o primeiro nome do autor e a data;
  - a política de escrita de `avaliacoes` passa a exigir contratação concluída (fecha o item 5 da banca).

### OUT
- Pagamento real ou gateway (Mercado Pago, Stripe).
- Profissional avaliar o cliente.
- Negociação por contraproposta do cliente (o cliente só aprova ou recusa; a conversa sobre o preço continua no chat).
- Admin editando valor ou apagando avaliação.

### LATER
- Pagamento simulado (forma de pagamento + status "pago") — próximo passo natural depois do orçamento aprovado.
- Favoritos (HU05).
- Resposta do profissional a uma avaliação; denúncia e moderação de avaliações.
- Sinais pós-aprovação (nota baixa ou muitos cancelamentos voltam o profissional para revisão — Nível C).
- Valor do orçamento na consulta do admin (US-020) e nos indicadores (US-017).

## Constraints / Feasibility
- Front sem build (HTML/CSS/JS), Supabase com RLS; DDL e escrita no banco são aplicadas pelo PO no SQL Editor; migrations só incrementais (DEBT-008), próxima livre: `015_*`.
- A transição de status é protegida por trigger: o orçamento precisa entrar nessa regra (ex.: `concluida` só com orçamento aprovado), não só na tela.
- O admin não lê chat nem contratação pela tabela (BR21; US-020 usa função própria): a tabela de orçamento segue o mesmo padrão.
- Valor em reais com centavos; guardar em `numeric(10,2)` ou em centavos inteiros (decisão do Requirements).
- Sem notificação push: o outro lado vê a mudança pela atualização que as telas de contratação já fazem.
- Telas candidatas: `servico-andamento.html` (contratação aceita), `contratacoes.html` (lista, mostra "aguardando valor"/"valor a aprovar"), `profissional.html` (comentários) e uma tela ou bloco de avaliação na contratação concluída.

## Assumptions
- [ASSUMPTION] Um orçamento vale para o serviço inteiro (sem itens nem parcelas).
- [ASSUMPTION] Não há prazo de validade do valor enviado; ele vale até o cliente responder ou cancelar.
- [ASSUMPTION] Valor mínimo R$ 1,00 e máximo R$ 100.000,00 (barra erro de digitação).
- [ASSUMPTION] A contratação `aceita` que já existe sem orçamento (1 no banco real) passa a seguir a regra nova: para concluir, precisa de valor aprovado.
- **[DECIDIDO]** A avaliação do seed sem contratação concluída é apagada na migration; depois dela, toda avaliação no banco tem contratação concluída entre as partes.

## Risks
- **Mudar a máquina de estados da contratação** (aceita → cancelada; concluída só com valor aprovado) pode quebrar telas e testes da Sprint 02 (`contratacao_api.mjs`, `contratacao_telas.mjs`). Mitigação: rodar os testes da contratação depois da migration.
- **Dado antigo:** 1 contratação `aceita` sem orçamento fica presa até o profissional enviar valor — comunicar ou concluir antes da migration.
- **Nota do perfil muda** do profissional que tinha a avaliação do seed (apagada por decisão do PO).
- **Concentração de trabalho** (retrospectiva da Sprint 03): as stories desta iniciativa precisam de responsável que commita.

## Open Questions
- [RESOLVIDA 2026-11-27] Recusa do valor: o profissional pode mandar outro valor, sem limite; o cliente pode cancelar enquanto não aprovar.
- [RESOLVIDA 2026-11-27] Avaliação: só cliente com contratação concluída; editável; comentário público com primeiro nome e data.
- [RESOLVIDA 2026-11-27] Avaliação do seed sem contratação: apagar na migration.

## Review & Adjust

- [x] Usuario revisou a proposta completa
- [x] Alteracoes solicitadas foram incorporadas
- [x] Decisoes relevantes foram confirmadas
- [x] Nao existem perguntas bloqueantes abertas

### User adjustments
- 2026-11-27 (C0): NORMAL PROCESS aprovado; escopo = orçamento + avaliação (pagamento simulado e favoritos ficam para depois); orçamento acontece depois do aceite.
- 2026-11-27 (D1): PO confirmou as 3 respostas (novo valor sem limite e cancelamento antes da aprovação; avaliação só de cliente com contratação concluída, editável, comentário público; apagar a avaliação do seed) e aprovou o Discovery.

## Gate G0 — PROBLEM READY

**Status:** APPROVED (2026-11-27)

**Aprovado pelo usuario:** sim
