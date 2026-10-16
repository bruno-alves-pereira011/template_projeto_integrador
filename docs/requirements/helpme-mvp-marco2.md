# Requirements — HelpMe: MVP funcional do Marco 2

**Status:** REQUIREMENTS_READY (revisao 2)
**Discovery de origem:** `docs/discovery/helpme-mvp-marco2.md`
**Classificacao de Processo:** NORMAL PROCESS

## Intent Summary
Qualquer visitante encontra um profissional aprovado de uma categoria e o contata por telefone/WhatsApp; profissionais se cadastram, completam o perfil e aparecem no diretorio depois de aprovados pela equipe. Tudo contra o Supabase real, sem dados de demonstracao, com seguranca garantida por RLS. Clientes logados contratam o profissional direto pelo app, com data/horario desejado e chat.

## Functional Requirements

### Diretorio e contato (principal — publico, sem login)
- **FR01** — A home lista as categorias vindas da tabela `categorias` (nome, sigla, cor, descricao), acessivel sem login. *(HU01)*
- **FR02** — Ao escolher uma categoria, o sistema lista os profissionais **aprovados** dessa categoria (nome, cidade/bairro, media de notas), com filtro opcional por cidade/bairro. Lista vazia mostra mensagem amigavel. *(HU01)*
- **FR03** — O perfil do profissional exibe nome, descricao, cidade/bairro, categorias, media de notas e total de avaliacoes. *(HU02)*
- **FR04** — O perfil oferece botao "Ligar" (`tel:`) e botao "WhatsApp" (`https://wa.me/55<DDD+numero>`); botao so aparece se o respectivo numero existir. *(HU03)*

### Conta e acesso
- **FR05** — Cadastro com nome, e-mail, senha e tipo (cliente ou profissional); o tipo e enviado nos metadados do `signUp`. *(base para HU01–HU05)*
- **FR06** — Profissional completa o perfil: WhatsApp, telefone, cidade, bairro, descricao, data de nascimento e uma ou mais categorias; pode editar depois.
- **FR07** — Login roteia: cliente → home; profissional sem perfil completo → completar perfil; profissional pendente/recusado → `bloqueio.html`; profissional aprovado → area do profissional.
- **FR08** — `bloqueio.html` informa que o cadastro esta em analise (ou recusado) e oferece "Sair".
- **FR09** — Paginas protegidas usam um helper unico que exige sessao e tipo esperado, redirecionando quando nao atendido; usuario logado pode sair (logout) de qualquer pagina protegida.

### Contratacao no app (logo apos conta/acesso — exige login de cliente)
- **FR10** — No perfil do profissional, o cliente clica "Contratar" e envia descricao do servico, endereco e data/horario desejado; visitante sem login e levado ao login e volta ao perfil.
- **FR11** — Cliente ve a lista das suas contratacoes com status atualizado em tempo real e pode cancelar enquanto `solicitada`.
- **FR12** — Profissional aprovado ve as solicitacoes recebidas (com data desejada) e aceita ou recusa; a lista atualiza em tempo real.
- **FR13** — Na contratacao aceita, cada parte ve nome e contato (tel/WhatsApp) da outra; qualquer uma marca como concluida.
- **FR14** — Cada contratacao tem um chat de texto em tempo real entre cliente e profissional, disponivel enquanto `solicitada` ou `aceita`; depois disso o historico fica somente leitura.

## Business / Domain Rules
- **BR01** — Profissional so pode se cadastrar com 18 anos ou mais (validado no front e no banco).
- **BR02** — Profissional atua em uma ou mais categorias; categoria pode existir sem profissional.
- **BR03** — So profissionais com `status_aprovacao = 'aprovado'` aparecem no diretorio e veem pedidos; status inicia `'pendente'` e so a equipe altera (pelo painel).
- **BR04** — A conversa pode acontecer no chat do app ou fora (telefone/WhatsApp); no Marco 2 o pagamento acontece fora do sistema.
- **BR05** — Tipo de usuario (cliente/profissional) nao muda depois do cadastro.
- **BR06** — Transicoes da contratacao: `solicitada → aceita | recusada` (so o profissional contratado), `solicitada → cancelada` (so o cliente), `aceita → concluida` (qualquer das partes). Nenhuma outra transicao e permitida.
- **BR07** — Dados de contato do cliente so ficam visiveis ao profissional apos o aceite.
- **BR08** — So cliente e profissional da contratacao leem e enviam mensagens; nao se envia mensagem em contratacao recusada, cancelada ou concluida.
- **BR09** — A data/horario desejado nao pode estar no passado.
- **BR10** — So usuarios do tipo cliente contratam, e so profissionais aprovados podem ser contratados.

## Non-Functional Requirements
- **NFR01** — Seguranca: RLS ativo em todas as tabelas; front usa apenas a `anon key`; `service_role` nunca no front nem em commits.
- **NFR02** — Privacidade: o diretorio le da view `profissionais_publicos` (nao expoe `data_nascimento` nem dados de usuarios nao aprovados).
- **NFR03** — Stack: HTML/CSS/JS puro + Supabase via CDN, sem build e sem novas dependencias; reaproveitar `global.css`/`auth.css`/`dashboard.css` e o padrao `<template>` + `textContent`.
- **NFR04** — Usabilidade mobile: telas utilizaveis em 360px de largura; botoes de contato com area de toque adequada.
- **NFR05** — Acessibilidade basica: labels nos campos, foco visivel, contraste adequado.
- **NFR07** — Chat: mensagens exibidas com `textContent` (sem HTML), limite de 1000 caracteres, ordem cronologica.
- **NFR06** — Manutenibilidade: configuracao do Supabase em um unico arquivo; categorias com fonte unica (tabela); comentarios curtos explicando o porque.

## User Scenarios
### Main flow — Visitante encontra e contata profissional
1. Visitante abre o app e ve as categorias (sem login).
2. Escolhe "Encanador" → ve profissionais aprovados (opcionalmente filtra por bairro).
3. Abre um perfil → ve dados, categorias e media de notas.
4. Toca em "WhatsApp" → abre conversa com o numero do profissional.

### Main flow — Profissional entra no diretorio
1. Cadastra-se como profissional → completa perfil (18+, categorias).
2. Faz login → ve `bloqueio.html` ("em analise").
3. Equipe aprova no painel → no proximo login vai para a area do profissional e aparece no diretorio.

### Alternative / Error / Edge cases
- Confirmacao de e-mail ativa: `signUp` sem sessao → mensagem "confirme seu e-mail"; perfil completado no primeiro login (FR07).
- Menor de 18: front bloqueia antes de enviar; banco rejeita se burlado.
- Nenhuma categoria marcada: front impede salvar.
- Numero com mascara/espacos/+55: normalizado para so digitos com DDD; numero invalido → botao oculto.
- Categoria sem profissionais aprovados → estado vazio.
- `?id=` inexistente ou nao aprovado → mensagem "profissional nao encontrado".
- E-mail ja cadastrado / senha fraca / credenciais invalidas → mensagem clara.
- Cliente cancela enquanto o profissional aceita ao mesmo tempo → so a primeira transicao vale; a outra parte ve aviso e a tela recarrega.
- Data/horario no passado → front bloqueia e banco rejeita.
- Visitante clica "Contratar" sem login → vai ao login e volta ao perfil.
- Profissional tenta contratar → botao nao aparece / banco rejeita.
- Mensagem vazia ou acima de 1000 caracteres → nao envia.
- Profissional acessa pagina de cliente (ou vice-versa) → redirecionado.

## Business / Domain Context
- Projeto Integrador IFES Serra; avaliacao cobra rastreabilidade HU × Prototipo × Modelo.
- HUs do README: HU01–HU03 (Marco 2), HU04–HU05 (Marco 3). Pedidos sao funcionalidade extra decidida pela equipe (D1).

## Technical Context & Constraints
- Schema da Fase 1: `supabase/migrations/001_schema.sql` — **precisa ser revisado antes de aplicar**: `pedidos` → `contratacoes` (com `profissional_id` obrigatorio, `data_desejada`, status `solicitada|aceita|recusada|cancelada|concluida`) e nova tabela `mensagens` (RLS so das partes, Realtime). Como o banco pode ser recriado (D3) e o 001 ainda nao foi aplicado, a revisao e feita no proprio 001.
- URL do projeto: `https://btjjbtjxcbvswgezpwgc.supabase.co`.
- Agentes nao acessam o painel do Supabase; a equipe aplica SQL e reporta.
- Realtime em `contratacoes` e `mensagens`, filtrado pelas proprias linhas via RLS.

## Quality Attributes
- **Security** (RLS, aprovacao manual) e **reliability** do fluxo principal sao os atributos criticos; **maintainability/explicabilidade** do codigo pela equipe.

## Assumptions
- **A01** — Telefone do cliente e opcional no cadastro (contato do cliente no pedido usa o que existir).
- **A02** — Profissional aprovado que edita o perfil continua aprovado (sem nova analise).
- **A03** — Area do profissional aprovado = lista de contratacoes recebidas (substitui o feed de pedidos) com link "editar meu perfil".
- **A04** — Filtro por cidade/bairro e por texto simples (sem geolocalizacao).

## Out of Scope
- Painel admin de aprovacao; pedido aberto para a categoria (substituido); orcamento e pagamento simulado (Marco 3); gateway de pagamento real; framework/build; avaliar/favoritar (Marco 3); testes automatizados e deploy (Marco 3); apagar `arquivos/`.

## Open Questions
- (nenhuma bloqueante)

## Key Decisions Proposed
- Diretorio publico (decidido no Discovery) — leitura anonima via view `profissionais_publicos`.
- Fonte unica de categorias = tabela `categorias` (remove `CATEGORIAS` hard-coded do JS).
- Telas novas: `profissionais.html`, `profissional.html`, `completar-perfil.html`, `contratar.html`, `contratacoes.html` (lista do cliente ou do profissional), `contratacao.html` (detalhe + chat + acoes). Os stubs `solicitar-pedido`, `espera-cliente`, `servico-andamento` e o `feed-profissional` sao substituidos.
- Contratacao (FR10–FR14) so inicia depois de FR01–FR09 prontos.
- Contratacao direta substitui o pedido aberto para a categoria.

## Review & Adjust

O usuario pode **aprovar, editar, adicionar, remover ou reclassificar** qualquer requisito/regra antes do gate.

- [x] Proposta completa apresentada ao usuario (revisao 2)
- [x] Ajustes solicitados incorporados
- [x] IDs estabilizados depois da revisao
- [x] Nenhuma pergunta bloqueante aberta

### User adjustments
- 2026-10-09: aprovado sem ajustes ("prossiga").
- 2026-10-09 (rev. 2): FR10–FR13 reescritos para contratacao direta; FR14 chat; BR04 e BR06 alteradas; BR08–BR10 e NFR07 novas; A03 alterada.

## Gate G1 — REQUIREMENTS READY

**Status:** APPROVED

**Aprovado pelo usuario:** sim (rev. 1 e rev. 2, 2026-10-09)
