# Discovery — HelpMe: MVP funcional do Marco 2

**Status:** PROBLEM_READY (revisao 2)
**Classificacao de Processo:** NORMAL PROCESS
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
- Painel administrativo de aprovacao (aprovacao e manual pelo Table Editor — D2).
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
- [ASSUMPTION] Profissional aprovado cai no `feed-profissional.html`, com acesso a "editar meu perfil".
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
