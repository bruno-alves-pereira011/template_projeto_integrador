# Task Breakdown: [DEBT-009] Navegacao por papel e "Voltar" sem vaivem

**Data:** 2026-11-24
**Participantes:** Bruno Alves
**Estimativa total:** 2 pontos
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**BDD associado:** N/A (testes de tela real com Playwright/Edge, fora do repositorio)
**Behavior change:** YES
**Branch:** `fix/DEBT-009-navegacao-por-papel` (criada a partir de `feat/US-020`; contem tambem os commits de US-019/US-020 que ainda nao estao em `main`)

---

## Problema e causa raiz

Pedido do usuario (Fase 1 do texto "melhoriasHP"): o profissional entrava em "looping" no proprio perfil e era levado a Home sem querer.

- Nao havia redirecionamento automatico. Todas as saidas de `profissional.html`, `profissionais.html` e `home-cliente.html` apontavam para a home do cliente: o profissional que abria "Meu perfil publico" ficava preso entre o perfil e a home, sem caminho para o painel.
- O "Voltar" era link comum: empilhava a tela anterior de novo, e o botao voltar do navegador reabria a tela que o usuario tinha acabado de deixar.

## O que foi feito

1. **Menu por papel** (`helpme-app/js/telas/navegacao.js`): o menu lateral e montado a partir de uma lista unica (`ITENS_MENU`) em `home-cliente.html`, `profissionais.html`, `profissional.html` e `contratacoes.html`. Cada HTML ficou so com um bloco minimo (`<nav data-menu-papel>` + `[data-menu-conta]`), que e o menu de visitante se o JS nao rodar.
   - "Meu painel" = mesma pagina para onde o login leva (`destinoDoPapel`).
   - "Entrar" nao pisca para quem tem sessao salva (render sincrono pelo `localStorage`).
   - Recarrega a pagina se a sessao mudar em outra aba (`storage`) ou ao voltar do bfcache (`pageshow`).
2. **"Voltar" pelo historico** (`data-voltar-historico`): so usa `history.back()` quando a entrada anterior DESTA aba e o destino do link (Navigation API), com trava contra clique duplo/triplo. Sem a Navigation API, o link navega normalmente.
3. **Regra unica de papel** (`helpme-app/js/servicos/sessao.js`): `lerPapel()`, `destinoDoPapel()` e `profissionalLiberado()`, usados pelo login, por `exigirSessao()`, pelo menu e por `contratacoes.js`. `buscarUsuario(id, comContato)` so le telefone quando a tela precisa.
4. **"Sair"** (`encerrarSessao()`): `signOut({ scope: 'local' })`; sem rede, apaga a sessao salva mesmo assim. Um "Sair" so no codigo.
5. **Perfil proprio** (`perfil-profissional.js`): aviso "Este e o seu perfil publico", "Voltar para o meu painel" e sem "Contratar". "Proprio" e decidido pelo id da sessao (funciona mesmo se a leitura do papel falhar). O destino do "Voltar" fica so em `aplicarVoltar()`.
6. **Celular**: o menu quebra linha em vez de cortar (`dashboard.css`).
7. **Reorganizacao de `helpme-app/js/`** (pedido do usuario): `js/servicos/` (sem DOM: supabase-config, sessao, categorias, contratacao-comum, telefone, admin-comum) e `js/telas/` (um script por tela + `navegacao.js`). Caminhos atualizados nos 18 HTMLs; regra registrada em `docs/context.md`.

## Decisoes

| Decisao | Por que |
|---|---|
| **Admin nao contrata** (PO, 2026-11-24) | "O admin nao e cliente". A conta admin e do tipo `cliente` em `usuarios`, entao a politica de INSERT de `contratacoes` deixava passar. Agora: sem "Contratar" para admin; `exigirSessao('cliente')` e `contratacoes.html` mandam o admin para `admin.html`; migration 009 barra no banco. |
| 009 usa trigger, nao politica | A autoconferencia da 008 recusa politica em `contratacoes` que cite `eh_admin` (BR21). Um trigger que so recusa mantem a 008 valida se rodada de novo. |
| "Sair" com `scope: 'local'` | Sair de um aparelho nao derruba as sessoes dos outros (antes era global). |
| Admin nao usa `meu-perfil.html` | Consequencia de "admin nao e cliente": telas de cliente mandam ao painel. |

## Banca de revisao (2026-11-24)

Cinco revisores (hacker, usuario confuso, senior, testador, chefe) reprovaram a primeira versao com 17 itens. Todos foram tratados: 1-6 e 8-17 corrigidos; item 7 virou a decisao "admin nao contrata". O hacker nao achou falha critica (chave anon e publica por desenho; sem open redirect nem XSS; o menu e so visual, quem decide e `exigirSessao` + RLS).

## Testes (Edge real, banco real, so leitura)

| Bateria | Resultado |
|---|---|
| Navegacao original (visitante, cliente, prof1, prof3) | 42/42 |
| Testador da banca (abas, login com ?voltar, admin, offline, bfcache) | 66/66 |
| Um caso por item corrigido | 31/31 |
| Fumaca: 18 paginas x 4 contas, sem script 404 nem erro de JS | 8/8 |

Os scripts (Playwright para Python, `channel='msedge'`, `python -m http.server` servindo `helpme-app/`, POST/PATCH/DELETE em `/rest/v1/` abortados) ficaram na pasta temporaria da sessao e **nao estao no repositorio**. Offline, o supabase-js tenta de novo e o estado de erro do perfil so aparece depois de ~10 s (comportamento anterior; nao e regressao).

## Pendencias para continuar

1. **Aplicar `supabase/migrations/009_admin_nao_contrata.sql` no SQL Editor** e rodar `supabase/testes/009_admin_nao_contrata.sql` (esperado: A1 a A4 "ok").
2. Push da branch e PR para `main` (a branch leva junto US-019/US-020). Depois, publicar na Vercel: a versao hospedada ainda nao tem o DEBT-009.
3. Decidir se os testes Playwright passam a ser versionados (pasta a combinar; regra 7 do `AGENTS.md`).
4. Fases 2 a 7 do texto "melhoriasHP" (fotos de perfil, posts, arvores de perguntas, busca, dois modelos de contratacao, filtros e alertas): fora do escopo deste DEBT.

## Trabalho 3 de Programacao Web (analise de 2026-11-24)

O enunciado pede PHP + MySQL e hospedagem em InfinityFree ou Heroku; o HelpMe usa JS + Supabase (Postgres) e Vercel. **Confirmar as tres trocas com a professora.** Equivalencias ja existentes:

| Requisito | Onde esta |
|---|---|
| Login no banco, funcao organizada, senha criptografada, erro amigavel | `index.html`, `js/telas/auth.js` (mensagem na linha ~53), `js/servicos/sessao.js`; Supabase Auth (bcrypt) |
| Sessao guarda o id; nome lido do banco pelo id | `buscarUsuario(id)` em `sessao.js` |
| Formulario com 5 campos + 1 botao, validacao, mensagem de erro | `cadastro.html` (nome, e-mail, senha, telefone, tipo) |
| Consulta / inclusao / atualizacao | listas e perfil / cadastro, `solicitar-pedido.js`, chat / `meu-perfil.js`, `completar-perfil.js` |
| Script do banco com PK e FK | `supabase/migrations/001_schema.sql` |
| Sessao em outras paginas e logout | `exigirSessao()`, `encerrarSessao()` |

**Lacunas a fechar:**
1. Tela de exclusao evidente: hoje o unico DELETE e desmarcar categoria em "Editar meu perfil" (`completar-perfil.js`). Opcao: US-018 (gestao de categorias) com "excluir categoria sem uso".
2. Nome do usuario em todas as paginas logadas (hoje so home e admin): `navegacao.js` ja le o nome.
3. Cabecalho e rodape em arquivo unico (equivalente ao `include`): estender `navegacao.js` para montar a barra lateral inteira e um rodape.
4. Link da Vercel no `README.md` e uma secao "Trabalho 3: onde esta cada conceito" (cobre o "codigo comentado indicando os conceitos" e serve de roteiro para a reuniao).
