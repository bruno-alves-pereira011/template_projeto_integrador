# Discovery — HelpMe: MVP funcional do Marco 2

**Status:** PROBLEM_READY (revisao 3 — inclui area do administrador e aprovacao de profissionais, ver secao "Revisao 3")
**Classificacao de Processo:** NORMAL PROCESS (rev. 1–2) · HEAVY PROCESS (rev. 3: novo papel com privilegio, RLS, dados pessoais, muda a D2)
**Origem:** hibrido (codigo em `template_projeto_integrador/` + README do Marco 1 + briefing de diagnostico + decisoes da equipe)

## Intent
Entregar o Marco 2 do Projeto Integrador (IFES Serra): um MVP do **HelpMe** com fluxo ponta a ponta funcionando de verdade (Supabase real, sem modo demonstracao), em que o morador encontra um profissional de servico residencial e o contata por telefone/WhatsApp. A avaliacao da disciplina cobra rastreabilidade HU × Prototipo × Modelo, entao codigo e documentacao precisam contar a mesma historia.

## Problem
O app atual nao funciona ponta a ponta:
- a URL do Supabase esta errada (`.supabase.com`) e `cadastro.html` quebra com `SyntaxError` (declaracoes duplicadas);
- o codigo usa tres modelos de dados diferentes, nenhum igual ao README; login redireciona e a pagina expulsa o usuario;
- `home-cliente` e `feed-profissional` rodam com `MODO_DEMONSTRACAO = true`;
- o fluxo do README (diretorio: categoria → perfil → contato) nao existe; o que existe e um fluxo de pedidos nao documentado;
- nao havia SQL/RLS versionado — seguranca do banco desconhecida.

## Users / Stakeholders relevantes
- **Morador (cliente)** — precisa achar rapido um profissional confiavel de uma categoria e falar com ele.
- **Profissional** — quer ser encontrado; cria e mantem o proprio perfil; (extra) recebe e aceita pedidos.
- **Equipe (6 alunos)** — desenvolve, aprova profissionais manualmente pelo painel, apresenta e explica o codigo.
- **Professores/avaliadores** — cobram o fluxo funcionando e a rastreabilidade HU × tela × tabela.

## Current Situation
- Front estatico HTML/CSS/JS puro em `helpme-app/` (sem build), Supabase via CDN.
- Login e cadastro implementados mas quebrados; home do cliente e feed do profissional em modo demo; 4 telas de pedido sao stubs.
- **Fase 1 ja concluida (branch `feat/mvp-marco2`, ainda nao aplicada no Supabase real):** `supabase/migrations/001_schema.sql` com modelo unico (usuarios, profissionais, categorias, profissional_categoria, avaliacoes, favoritos, pedidos), RLS em todas as tabelas, triggers de regra de negocio, view `profissionais_publicos`, `seed.sql` e README secoes 7–8 atualizadas.
- Decisoes D1–D4 registradas em `template_projeto_integrador/docs/DECISOES.md`.

## Desired Outcome
Um avaliador consegue, no app rodando contra o Supabase real:
1. como **cliente**: entrar, escolher uma categoria, ver a lista de profissionais aprovados, abrir um perfil e iniciar ligacao/WhatsApp;
2. como **profissional**: cadastrar-se (18+), completar perfil com 1+ categorias, ver a tela de "em analise" ate ser aprovado, e depois aparecer no diretorio;
3. como **cliente logado**: contratar um profissional direto pelo perfil (descricao, endereco, data/horario desejado), conversar com ele por chat no app, acompanhar o status (solicitada → aceita/recusada → concluida) e concluir.

## Success Criteria
- Fluxos 1 e 2 acima executados sem erro com os usuarios do `seed.sql`, sem nenhum dado fixo/demo no front.
- HU01, HU02 e HU03 rastreaveis para tela + tabela no README (secao 9).
- Testes manuais de RLS: nao e possivel ler perfil privado de outro usuario, se autoaprovar, nem aceitar pedido ja aceito.
- README com secao "Como rodar o projeto" que permite a outro membro da equipe subir o ambiente.
- Fluxo 3 (contratacao + chat) funcionando com os usuarios do seed, com RLS impedindo terceiros de ler a contratacao ou as mensagens.

## Scope

### IN
- Aplicar o schema da Fase 1 no Supabase real e validar.
- Correcao da base do front: URL, config unica do Supabase, padrao unico de carregamento de scripts, remover modo demo, categorias centralizadas.
- Autenticacao: cadastro de cliente e profissional (`signUp` com `nome`/`tipo_usuario`), completar perfil do profissional (WhatsApp, telefone, cidade, bairro, data de nascimento 18+, categorias multiplas), login com roteamento por tipo e status de aprovacao, `bloqueio.html`, helper unico de sessao.
- **Diretorio publico:** HU01–HU03 acessiveis sem login (visitante busca, ve perfil e contata); login exigido so para pedidos (e, no Marco 3, avaliar/favoritar).
- HU01 — listar profissionais aprovados por categoria (`profissionais.html?categoria=`), filtro por cidade/bairro opcional.
- HU02 — perfil do profissional (`profissional.html?id=`), com categorias e media de notas (leitura).
- HU03 — botoes `tel:` e `https://wa.me/55<numero>` com normalizacao do numero.
- **Contratacao direta no app**, priorizada logo apos diretorio + conta/acesso: cliente logado contrata pelo perfil com data/horario desejado; profissional aceita ou recusa; ambos acompanham em tempo real e concluem; cliente cancela enquanto solicitada.
- **Chat em tempo real** entre cliente e profissional dentro de cada contratacao.
- Revisao do schema da Fase 1 (`pedidos` → `contratacoes`, novos status, `data_desejada`, tabela `mensagens` com RLS/Realtime).
- Documentacao minima: README (rastreabilidade HU × tela × tabela, pedidos como extra, "Como rodar").
- Revisao final: teste manual dos fluxos, tentativa de burlar RLS, checklist basico de acessibilidade/mobile.

### OUT
- ~~Painel administrativo de aprovacao (aprovacao e manual pelo Table Editor — D2).~~ *Movido para IN na revisao 3 (D6).*
- Pedido aberto para a categoria inteira (fluxo tipo "Uber") — substituido pela contratacao direta.
- Pagamento real / gateway (Mercado Pago, Stripe).
- Framework/build no front (equipe domina HTML/CSS/JS puro).
- Apagar arquivos de `arquivos/` (D4).

### LATER
- Orcamento (profissional envia valor, cliente aprova) e pagamento **simulado** (registra forma e status "pago", sem gateway) — Marco 3.
- HU04 Avaliar profissional e HU05 Favoritar (Marco 3) — tabelas ja existem no schema.
- Testes automatizados, lint, deploy de teste (Marco 3).
- Completar personas/PMC do README (`[PREENCHER]`, `[INSERIR IMAGEM]`).
- Melhorias de UX/visual alem do checklist basico.

## Constraints / Feasibility
- Stack fixa: HTML/CSS/JS puro + Supabase (Auth, Postgres, Realtime) via CDN; sem dependencias novas sem aprovacao.
- Agentes nao acessam o painel do Supabase: entregam SQL/instrucoes, a equipe aplica e reporta.
- `service_role` nunca no front nem em commits; seguranca garantida por RLS.
- Codigo e documentacao em portugues; comentarios explicando o porque (sera apresentado pela equipe).
- Prazo do Marco 2: ver Open Questions.

## Assumptions
- [ASSUMPTION] Confirmacao de e-mail pode estar ativa no Supabase; o fluxo deve funcionar nos dois casos (perfil do profissional completado apos o primeiro login quando nao houver sessao no `signUp`).
- [ASSUMPTION] Profissional aprovado cai no `feed-profissional.html`, com acesso a "editar meu perfil". *(Superada: cai em `contratacoes.html` — A03 dos requisitos, US-008.)*
- [ASSUMPTION] Uma unica migration (`001_schema.sql`) basta para o Marco 2, ja que o banco pode ser recriado (D3).
- [ASSUMPTION] As cores/siglas das categorias passam a vir da tabela `categorias` (fonte unica).

## Risks
- Schema ainda nao rodou no Supabase real — diferencas de ambiente (Auth, Realtime, permissoes padrao) podem exigir ajuste.
- Realtime + RLS: profissionais que perdem visibilidade de um pedido aceito nao recebem o UPDATE; o feed precisa recarregar.
- Confirmacao de e-mail ativa quebra o insert do perfil logo apos o cadastro se nao for tratada.
- Escopo cresceu (contratacao + chat) e compete com o fluxo principal pelo tempo da equipe.
- Chat: RLS de mensagens e Realtime precisam garantir que so as duas partes leem; conteudo livre exige `textContent` e limite de tamanho.
- Exposicao de `data_nascimento` se o front ler a tabela `profissionais` em vez da view publica.

## Open Questions
- [RESOLVIDA] Diretorio e publico; login so para pedidos/avaliar/favoritar.
- [RESOLVIDA] Contratacao entra logo apos diretorio + conta/acesso (data de entrega do Marco 2 ainda nao informada — nao bloqueante).
- [BLOCKING? nao] Telefone do cliente e obrigatorio no cadastro? (usado no `servico-andamento`)

## Review & Adjust

- [x] Usuario revisou a proposta completa (revisao 2)
- [x] Alteracoes solicitadas foram incorporadas
- [x] Decisoes relevantes foram confirmadas
- [x] Nao existem perguntas bloqueantes abertas

### User adjustments
- 2026-10-09: diretorio (HU01–HU03) definido como publico, sem login.
- 2026-10-09: pedidos priorizados depois do fluxo principal.
- 2026-10-09 (rev. 2): contratacao direta pelo perfil substitui o pedido aberto; Marco 2 inclui solicitar + data/horario e chat; orcamento e pagamento simulado vao para Marco 3; gateway real fora.

## Gate G0 — PROBLEM READY

**Status:** APPROVED

**Aprovado pelo usuario:** sim (rev. 1 e rev. 2, 2026-10-09)

---

## Revisao 3 — Area do administrador e aprovacao de profissionais

**Status:** PROBLEM_READY (aprovado em 2026-10-16)
**Origem:** revisao geral do projeto de 2026-10-16 (pedido do PO para o Fluxo 3) + codigo atual (`supabase/migrations/001_schema.sql`, `002_privacidade_data_nascimento.sql`, `helpme-app/`).
**Classificacao de Processo:** HEAVY PROCESS (aprovada pelo PO em 2026-10-16: "prossiga conforme recomendado").
**Nao altera** o escopo ja aprovado do Fluxo 3 (US-007 a US-010), que segue direto para o `/sprint-planning`.

### Intent
Substituir a aprovacao manual pelo Table Editor (D2) por uma **area administrativa centralizada** no app e por uma **triagem automatica** dos profissionais "em analise", reduzindo a analise individual sem aprovar indevidamente quem nao atende aos requisitos.

### Problem
- Nao existe papel de administrador: `usuarios.tipo_usuario` aceita so `cliente`/`profissional` e o trigger `validar_profissional` bloqueia qualquer mudanca de `status_aprovacao` vinda do app.
- A aprovacao depende de alguem com acesso ao painel do Supabase, abrindo linha por linha, sem criterio registrado nem historico de quem aprovou e por que.
- O profissional recusado/pendente ve so uma mensagem generica em `bloqueio.html` ("entre em contato com a equipe"), sem saber o que corrigir.
- Nao ha visao do sistema como um todo (quantos usuarios, fila de analise, contratacoes, categorias sem oferta).
- O perfil nao tem nenhum documento: com os dados atuais da para provar **consistencia** dos dados, nao **identidade**.

### Users / Stakeholders
- **Administrador geral** (alguem da equipe): aprova/recusa, acompanha indicadores, mantem categorias.
- **Profissional em analise**: quer ser aprovado rapido e saber o que corrigir.
- **Cliente**: indiretamente — confia que o diretorio so mostra profissionais validados.
- **Avaliadores da disciplina**: cobram seguranca (RLS) e rastreabilidade.

### Current Situation
- Aprovacao manual (D2); `status_aprovacao` em `pendente|aprovado|recusado`; RLS impede autoaprovacao.
- Regras ja automatizadas no banco: 18+ (trigger), status inicial forcado para `pendente`.
- Sem Storage, sem Edge Functions, sem backend proprio (NFR03).

### Desired Outcome
1. O administrador entra pelo mesmo login e cai em `admin.html` com indicadores do sistema.
2. Ve a fila de profissionais em analise ja **triada** (verde / pendencia do profissional / suspeito) e aprova os verdes **em lote** com um clique; abre o detalhe so dos suspeitos.
3. Toda decisao (do sistema ou do admin) fica registrada com autor, data e motivo; recusa exige motivo.
4. O profissional ve em `bloqueio.html` o motivo da pendencia/recusa, corrige o perfil e a triagem roda de novo sozinha.
5. O administrador mantem as categorias (criar, editar, desativar) sem usar o painel do Supabase.

### Success Criteria
- Nenhum usuario consegue se tornar administrador pelo app (nem pelos metadados do `signUp`); admin so e criado pelo SQL Editor.
- Profissional nao consegue aprovar a si mesmo nem pular a triagem (testes de RLS documentados).
- Caso "verde" vai da conclusao do perfil a aprovacao em 1 clique do admin; caso com pendencia volta ao profissional com motivo legivel, sem acao do admin.
- 100% das mudancas de `status_aprovacao` feitas pelo app tem registro de auditoria.
- Admin nao le o conteudo do chat das contratacoes (privacidade).

### Scope

#### IN (proposto)
- Papel de administrador: tabela `administradores` (preenchida so pelo SQL Editor) + funcao `eh_admin()`; **nao** e um terceiro `tipo_usuario` (BR05 continua valendo).
- Roteamento do login para `admin.html` e protecao das paginas admin no `sessao.js`.
- Painel com indicadores agregados (funcao que devolve so totais).
- Fila de analise com aprovacao/recusa individual e aprovacao em lote dos verdes; recusa com motivo obrigatorio; historico de decisoes.
- **Triagem automatica no banco (Nivel A, sem dependencia nova)**, executada no servidor ao concluir/editar o perfil: e-mail confirmado, 18+, perfil completo (cidade, bairro, descricao minima, 1+ categoria), telefone/WhatsApp com DDD valido; sinais de suspeita (telefone/WhatsApp repetido em outra conta, link/telefone/termo bloqueado na descricao, recadastro apos recusa).
- Politica dos casos verdes: **pre-aprovacao + aprovacao em lote por um humano** (configuravel para aprovacao automatica total no futuro).
- Motivo da pendencia/recusa visivel em `bloqueio.html` + reanalise apos o profissional corrigir.
- Reanalise de conteudo quando um profissional ja aprovado edita a descricao.
- Gestao de categorias: criar, editar e **desativar** (nao apagar: o `on delete cascade` removeria os vinculos dos profissionais).

#### OUT (proposto)
- Coleta de CPF, foto de documento ou selfie (Nivel B) — evita tratamento de dado pessoal sensivel (LGPD) no projeto academico.
- APIs externas de verificacao de identidade (Serpro Datavalid, idwall etc.) e Edge Functions.
- Admin lendo mensagens do chat.
- Admin criando/editando contratacoes.

#### LATER
- Suspender/reativar profissionais aprovados e consulta somente-leitura de contratacoes no admin (Could; Marco 3 se faltar tempo).
- Sinais pos-aprovacao (Nivel C): muitas recusas/cancelamentos, nota baixa, denuncias → volta para revisao (Marco 3, depende de HU04).
- Moderacao de avaliacoes (Marco 3).
- Nivel B (documento + selfie em bucket privado), se a equipe decidir no futuro.

### Constraints / Feasibility
- Stack fixa (NFR03): regras em Postgres (RLS, triggers, funcoes `security definer` com `search_path` fixo); telas em HTML/CSS/JS puro.
- O banco real **ja tem dados**: mudancas vao em migrations incrementais (`003_*`, `004_*`), sem editar nem reaplicar o `001`.
- `grant ... on all tables to authenticated` (001, secao 5): toda tabela nova precisa de RLS ligado no mesmo script.
- Agentes nao acessam o painel do Supabase: entregam SQL e roteiro de verificacao; a equipe aplica.

### Assumptions
- [ASSUMPTION] Um unico nivel de administrador (sem perfis de permissao diferentes).
- [ASSUMPTION] A confirmacao de e-mail sera ligada no Supabase (senao a checagem "e-mail confirmado" vira so aviso).
- [ASSUMPTION] Sem CPF, a deteccao de duplicidade usa telefone/WhatsApp normalizados.
- [ASSUMPTION] Profissional aprovado que edita o perfil continua aprovado (A02), **exceto** se a nova descricao disparar sinal de suspeita.
- [ASSUMPTION] A area admin entra no Marco 2, nas Sprints 03–04, depois do nucleo do Fluxo 3 (data de entrega do Marco 2 ainda nao informada).

### Risks
- Papel admin e a mudanca de RLS de maior risco do projeto: um erro em `eh_admin()` ou numa politica expoe dados de todos. Mitigacao: funcao `security definer` com `search_path` fixo, testes de RLS versionados, revisao por quem nao escreveu.
- Aprovacao sem verificacao de identidade: mitigada por manter um humano na aprovacao dos verdes.
- Triagem por regras gera falsos positivos (ex.: descricao com numero de rua confundido com telefone): casos vao para humano, nunca para recusa automatica.
- Conflito com a branch `refactor/ui-polish` (reescreve `dashboard.css`).
- Acesso ao painel do Supabase concentrado em uma pessoa (aplicar 003/004).

### Open Questions
- [BLOCKING? nao] Data de entrega do Marco 2 (afeta se US-017/US-018 cabem no Marco 2).
- [BLOCKING? nao] Quem sera o(s) administrador(es) inicial(is)?
- [BLOCKING? nao] `refactor/ui-polish` sera mesclada antes das telas novas?

### Key Decisions Proposed
- **D6 (aprovada em 2026-10-16, registrada em `docs/DECISOES.md`):** aprovacao de profissionais passa a ser feita pela area admin do app, com triagem automatica no banco e pre-aprovacao dos casos verdes aprovada em lote por um humano; papel admin em tabela propria, criado so pelo SQL Editor; sem coleta de documentos. Substitui a D2 quando aprovada.

### Review & Adjust (rev. 3)

- [x] Usuario revisou a proposta completa da revisao 3
- [x] Alteracoes solicitadas foram incorporadas (nenhuma solicitada)
- [x] Decisoes relevantes foram confirmadas (D6)
- [x] Nao existem perguntas bloqueantes abertas

#### User adjustments
- 2026-10-16: aprovado sem ajustes ("prossiga conforme recomendado").

### Gate G0 — PROBLEM READY (rev. 3)

**Status:** APPROVED

**Aprovado pelo usuario:** sim (rev. 3, 2026-10-16)
