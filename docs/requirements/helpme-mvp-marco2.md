# Requirements — HelpMe: MVP funcional do Marco 2

**Status:** REQUIREMENTS_READY (revisao 3 — inclui area do administrador, aprovacao de profissionais e conta do cliente, ver secao "Revisao 3")
**Discovery de origem:** `docs/discovery/helpme-mvp-marco2.md` (rev. 3 PROBLEM_READY em 2026-10-16)
**Classificacao de Processo:** NORMAL PROCESS (rev. 1–2) · HEAVY PROCESS (rev. 3)

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
- *(Nomes das telas de contratacao revistos pela D8 em 2026-10-23: `solicitar-pedido.html`, `contratacoes.html`, `espera-cliente.html` e `servico-andamento.html`; o item abaixo e o texto original da rev. 2.)*
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

---

## Revisao 3 — Area do administrador, aprovacao de profissionais e conta do cliente

**Status:** REQUIREMENTS_READY (aprovado em 2026-10-16)
**Discovery de origem:** secao "Revisao 3" de `docs/discovery/helpme-mvp-marco2.md` (PROBLEM_READY, 2026-10-16); decisoes D6 e D7 em `docs/DECISOES.md`.
**Efeito sobre a rev. 2:** "Painel admin de aprovacao" sai de *Out of Scope*; BR03 passa a dizer "so um administrador altera, pelo app ou pelo painel". O restante da rev. 2 (FR01–FR14, BR01–BR10, NFR01–NFR07) continua valendo sem mudanca.

### Functional Requirements (rev. 3)

#### Acesso do administrador
- **FR15** — Ao entrar, um administrador e levado para `admin.html`. Toda pagina `admin*.html` exige sessao de administrador; quem nao e admin e redirecionado para a pagina inicial do proprio tipo. *(US-014)*

#### Painel
- **FR16** — `admin.html` mostra indicadores agregados: usuarios por tipo; profissionais por status; tamanho da fila de analise e tempo medio em analise; contratacoes por status nos ultimos 7 e 30 dias; taxa de aceite (aceitas ÷ respondidas); categorias ativas sem nenhum profissional aprovado. *(US-017)*

#### Fila de analise
- **FR17** — `admin-analise.html` lista os profissionais `pendente` com o resultado da ultima triagem (verde / pendencia / suspeito), os motivos e o tempo na fila; filtra por resultado. *(US-015)*
- **FR18** — No detalhe (`admin-profissional.html`), o admin ve os dados do perfil, as checagens da triagem e o historico de decisoes, e aprova ou recusa o profissional; a recusa exige motivo. *(US-015)*
- **FR19** — Na fila, o admin seleciona profissionais com resultado **verde** e aprova todos em uma acao (aprovacao em lote). *(US-015)*

#### Triagem automatica
- **FR20** — Ao salvar o perfil profissional (criacao ou edicao), o sistema executa a triagem no banco e grava o resultado com a lista de checagens (BR13, BR14). *(US-016)*
- **FR21** — O profissional pendente ou recusado ve em `bloqueio.html` o motivo — pendencias da triagem ou motivo da recusa — e um link para corrigir o perfil; ao salvar, a triagem roda de novo. Profissional recusado pode reenviar para analise (BR17). *(US-013)*

#### Categorias
- **FR22** — `admin-categorias.html` permite criar categoria (nome, slug, sigla, cor, descricao), editar e desativar/reativar. *(US-018)*

#### Conta do usuario
- **FR23** — "Esqueci minha senha" no login: o usuario informa o e-mail, recebe um link de redefinicao e define uma nova senha numa pagina do app. *(US-011)*
- **FR24** — O cliente logado edita nome e telefone em "Meu perfil". *(US-012)*

#### Could / LATER (registrados para nao perder rastreabilidade)
- **FR25** *(Could)* — Admin suspende e reativa profissional aprovado, com motivo. *(US-019)*
- **FR26** *(Could)* — Admin consulta contratacoes (lista e filtros), somente leitura e sem acesso ao chat. *(US-020)*

### Business / Domain Rules (rev. 3)
- **BR11** — Administrador e quem tem linha na tabela `administradores`, criada so pelo SQL Editor. **Nao** e um `tipo_usuario` (BR05 inalterada). Pelo app, so administrador muda `status_aprovacao`; o proprio profissional nunca.
- **BR12** — Resultado da triagem: **verde** (todas as checagens obrigatorias passaram e nao ha sinal de suspeita), **pendencia** (alguma checagem obrigatoria falhou: o profissional corrige), **suspeito** (algum sinal de suspeita: humano decide). A triagem **nunca aprova nem recusa sozinha**: ela so classifica (D6). Excecao: a BR18.
- **BR13** — Checagens obrigatorias: e-mail confirmado; 18 anos ou mais; cidade e bairro preenchidos; descricao com pelo menos 30 caracteres; pelo menos 1 categoria ativa; WhatsApp ou telefone com DDD brasileiro valido e 10 ou 11 digitos (11 digitos = celular comecando com 9).
- **BR14** — Sinais de suspeita: WhatsApp ou telefone (normalizado) igual ao de outro profissional; descricao contendo link, e-mail, sequencia de 8+ digitos (telefone embutido) ou termo da lista de bloqueio; profissional ja recusado anteriormente.
- **BR15** — A aprovacao (individual ou em lote) e conferida no banco no momento da acao: so aprova quem esta `pendente`; no lote, so quem tem a ultima triagem **verde**. Itens que nao atendem sao ignorados e informados ao admin.
- **BR16** — Recusa exige motivo de 10 a 500 caracteres, que fica visivel ao profissional.
- **BR17** — Profissional recusado pode corrigir o perfil e reenviar: volta a `pendente`, passa por nova triagem e o sinal "ja recusado" (BR14) garante revisao humana.
- **BR18** — Se um profissional **aprovado** editar o perfil e a triagem gerar pendencia ou suspeita, ele volta para `pendente` (sai do diretorio) ate nova aprovacao. Contratacoes ja aceitas continuam e podem ser concluidas (BR06 nao exige aprovacao para concluir).
- **BR19** — Toda decisao (triagem do sistema, aprovacao, recusa, reenvio) grava historico: profissional, resultado/acao, autor (sistema ou id do admin), motivo e data. O historico nao e editado nem apagado pelo app.
- **BR20** — Categoria nao e apagada pelo app, so desativada. Desativada some da home, da lista de categorias do `completar-perfil` e nao conta como "categoria ativa" na BR13; os vinculos existentes sao mantidos.
- **BR21** — Administrador nao le mensagens do chat.
- **BR22** — A redefinicao de senha mostra a mesma mensagem exista ou nao o e-mail (nao revela quem tem cadastro).

### Non-Functional Requirements (rev. 3)
- **NFR08** — Seguranca do papel admin: `eh_admin()` e `security definer`, `stable`, com `search_path` fixo; toda tabela nova liga RLS e cria politicas no mesmo script; mudancas so em migrations incrementais (`003_*`, `004_*`) — D7.
- **NFR09** — Privacidade dos indicadores: o painel le uma funcao que devolve so totais, nunca linhas de usuarios.
- **NFR10** — Auditabilidade: 100% das mudancas de `status_aprovacao` feitas pelo app tem registro em historico (BR19).
- **NFR11** — Verificacao de seguranca versionada: roteiro SQL de testes de RLS do papel admin e da triagem em `supabase/` (ex.: `supabase/testes/`), executado pela equipe antes do merge de cada migration.
- **NFR03, NFR04, NFR05** (stack, mobile 360px, acessibilidade) valem para todas as telas novas.

### User Scenarios (rev. 3)

#### Main flow — Admin aprova cadastros verdes em lote
1. Admin entra → `admin.html` mostra "Fila de analise: 7 (5 verdes, 1 pendencia, 1 suspeito)".
2. Abre a fila, filtra "verde", seleciona os 5 e clica "Aprovar selecionados".
3. Os 5 aparecem no diretorio; o historico registra o admin como autor.

#### Main flow — Profissional corrige pendencia sozinho
1. Profissional salva o perfil com descricao curta → triagem: pendencia ("descricao com menos de 30 caracteres").
2. No login, `bloqueio.html` mostra o motivo e o link "Corrigir meu perfil".
3. Corrige e salva → triagem verde → entra na fila como verde, sem o admin abrir o detalhe.

#### Main flow — Caso suspeito
1. Profissional usa o mesmo WhatsApp de outra conta → triagem: suspeito.
2. Admin abre o detalhe, ve "WhatsApp igual ao de <nome>", recusa com motivo.
3. Profissional ve o motivo em `bloqueio.html`.

#### Alternative / Error / Edge cases
- Usuario faz `signUp` com `tipo_usuario = 'admin'` nos metadados → vira cliente (comportamento atual de `handle_new_user`); nao ganha acesso admin.
- Cliente ou profissional abre `admin.html` → redirecionado; chamada direta das funcoes admin pela API → erro de permissao.
- Dois admins aprovam/recusam o mesmo profissional ao mesmo tempo → a primeira acao vale; a segunda e ignorada e informada (BR15).
- Lote com profissional que deixou de ser verde (editou o perfil depois que a fila carregou) → ignorado e informado.
- Recusa sem motivo ou com menos de 10 caracteres → nao envia.
- Confirmacao de e-mail desligada no Supabase → checagem "e-mail confirmado" passa sempre (A06).
- Descricao com numero de rua ("Rua 12, casa 3") → nao dispara (precisa de 8+ digitos seguidos); se houver falso positivo, vai para humano, nunca para recusa.
- Desativar a unica categoria de um profissional aprovado → continua aprovado, mas some da busca por categoria; o painel mostra o caso.
- "Esqueci minha senha" com e-mail inexistente → mesma mensagem de sucesso (BR22).

### Business / Domain Context (rev. 3)
- Substitui a D2 (aprovacao pelo Table Editor) pela D6. A rastreabilidade HU × tela × tabela do README (DEBT-001) precisa incluir as telas admin.

### Technical Context & Constraints (rev. 3)
- **Migration `003_admin.sql`:** tabela `administradores (usuario_id pk → usuarios)`; `eh_admin()`; tabela `analises_profissional` (profissional_id, resultado, checagens `jsonb`, acao, autor_id nulo = sistema, motivo, created_at); coluna `categorias.ativa`; funcao admin para aprovar/recusar (individual e lote) aplicando BR15/BR16; funcao `painel_admin()` (NFR09); politicas de leitura para admin em `usuarios`, `profissionais`, `profissional_categoria`, `categorias` (escrita) e `contratacoes` (so se FR26 entrar) — nunca em `mensagens`.
- **Migration `004_triagem.sql`:** funcao `solicitar_analise()` chamada pelo `completar-perfil.js` ao final do salvamento (as categorias sao gravadas em requisicao separada, depois do perfil, entao um trigger em `profissionais` rodaria cedo demais). Por ser `security definer`, o `current_user` dentro dela e o dono, entao `eh_papel_cliente_api()` devolve falso e o trigger `validar_profissional` permite a volta para `pendente` (BR17, BR18) sem abrir essa porta ao usuario.
- `validar_profissional` ganha o ramo "admin pela API pode mudar `status_aprovacao`" (hoje bloqueia todo `authenticated`).
- Front: `sessao.js` ganha o destino admin (consulta `eh_admin()` por RPC) e `exigirSessao('admin')`; `bloqueio.js` le o motivo da ultima analise; `categorias.js` filtra `ativa = true`.
- Redefinicao de senha: `supabaseClient.auth.resetPasswordForEmail` + `updateUser({ password })` — ja fazem parte do supabase-js, sem dependencia nova.

### Quality Attributes (rev. 3)
- **Security** (papel admin, RLS) e **auditability** (historico) sao criticos; **eficiencia operacional** (aprovacao em lote) e o ganho principal.

### Assumptions (rev. 3)
- **A05** — Um unico nivel de administrador.
- **A06** — A confirmacao de e-mail sera ligada no Supabase; enquanto estiver desligada, a checagem correspondente passa sempre.
- **A07** — Lista de bloqueio inicial curta, mantida dentro da funcao de triagem (editavel por SQL); tela para mante-la fica LATER.
- **A08** — Aprovacao automatica total (sem humano) fica **desligada**; pode ser reavaliada depois de existir verificacao de identidade.
- **A09** — O primeiro administrador e inserido pela equipe no SQL Editor apos a `003`.

### Out of Scope (rev. 3)
- CPF, documento, selfie; APIs de verificacao de identidade; Edge Functions; admin lendo chat ou editando contratacoes; tela de lista de bloqueio; moderacao de avaliacoes; sinais pos-aprovacao (Marco 3).

### Open Questions (rev. 3)
- (nenhuma bloqueante) Data de entrega do Marco 2 — decide se FR16, FR22, FR23 e FR24 cabem no Marco 2 ou escorregam.

### Key Decisions Proposed (rev. 3)
- A triagem **classifica**, quem **decide** e o admin (BR12) — exceto a volta automatica para `pendente` da BR18.
- Recusado pode reenviar, sempre com revisao humana (BR17).
- Profissional aprovado que edita e gera alerta sai do diretorio ate nova aprovacao (BR18).
- Categoria so desativa, nunca apaga (BR20).
- Roteiro de testes de RLS versionado (NFR11).

### Rastreabilidade Requisitos → Stories (rev. 3)

| Requisito | Story candidata |
|-----------|-----------------|
| FR15, BR11, NFR08 | US-014 |
| FR17, FR18, FR19, BR15, BR16, BR19, NFR10 | US-015 |
| FR21, BR17 | US-013 |
| FR20, BR12, BR13 | US-016 |
| BR14, BR18 | US-021 (dividida da US-016 no Modo Backlog) |
| FR16, NFR09 | US-017 |
| FR22, BR20 | US-018 |
| FR23, BR22 | US-011 |
| FR24 | US-012 |
| FR25 / FR26, BR21 | US-019 / US-020 (Could) |
| NFR11 | criterio comum de US-014, US-015 e US-016 |

### Review & Adjust (rev. 3)

- [x] Proposta completa apresentada ao usuario
- [x] Ajustes solicitados incorporados (nenhum solicitado)
- [x] IDs estabilizados depois da revisao
- [x] Nenhuma pergunta bloqueante aberta

#### User adjustments
- 2026-10-16: aprovado sem ajustes ("prossiga com a execucao conforme recomendado").

### Gate G1 — REQUIREMENTS READY (rev. 3)

**Status:** APPROVED

**Aprovado pelo usuario:** sim (rev. 3, 2026-10-16)
