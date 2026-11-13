# Task Breakdown: [US-012] Meu perfil do cliente

**Data:** 2026-11-13
**Participantes:** Bruno Alves (responsáveis na Sprint 03: Bruno Alves e Gabriel)
**Estimativa total:** 2 pontos (~3,5 h)
**Nivel ScrumAIDev:** 0
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** N/A
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06, mantida no planejamento da Sprint 03)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** o cliente edita só a própria linha de `usuarios`. A política "usuarios: editar o proprio perfil" e o trigger `proteger_usuario` (que bloqueia `tipo_usuario`, `id` e `created_at`) já existem no `001`.
- **Justificativa:** não há API própria e o banco não muda.
- **Touch List aplicável:** `helpme-app/meu-perfil.html` (novo), `helpme-app/js/meu-perfil.js` (novo), `helpme-app/home-cliente.html` e `helpme-app/js/cliente.js` (link no menu), `helpme-app/contratacoes.html` e `helpme-app/js/contratacoes.js` (link no menu do cliente), `helpme-app/js/telefone.js` (`telefoneValido`), `helpme-app/js/auth.js` e `helpme-app/cadastro.html` (usar a mesma validação).
- **Desvio da Touch List da story:** além de `home-cliente.html`, o link "Meu perfil" entra no menu de `contratacoes.html`, a outra tela logada do cliente com menu lateral. `auth.js` e `cadastro.html` mudam para usar o mesmo `telefoneValido`, como sugerido em "IA Insights".
- **Runner BDD / contrato / mock:** N/A (sem runner).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Layout | Cartão de `auth.css` com barra do topo e Sair, igual a `solicitar-pedido.html`. |
| Regra do telefone | `telefoneValido` vai para `telefone.js` e passa a ser `normalizarTelefone(n) !== null`: 10 ou 11 dígitos, ou 12/13 começando com 55. Antes o cadastro aceitava qualquer número de 10 a 13 dígitos, inclusive alguns que não geravam link de WhatsApp. A regra fica um pouco mais rígida, e a mesma, no cadastro e no perfil. |
| Gravação | `update` em `usuarios` só de `nome` e `telefone` (telefone vazio vira `null`), com `.select()` para confirmar que 1 linha mudou. 0 linhas = RLS bloqueou, e a tela mostra erro em vez de sucesso falso. |
| Saudação da home | A home lê o nome de `user_metadata`. Depois de salvar, `auth.updateUser({ data: { nome } })` mantém a saudação certa. É feito por melhor esforço: se falhar, o erro só vai para o console, porque o dado oficial está em `usuarios`. |
| Link no menu | Aparece só para cliente: a home lê `usuarios.tipo_usuario` da própria linha (o `user_metadata` das contas do seed não tem o tipo) e `contratacoes.html` usa o papel que já calcula. Se a leitura falhar, o link fica escondido. A página em si é protegida por `exigirSessao('cliente')`. |

---

## Checagem de Principios (condicional)

Aplicável (`Behavior change` = YES).

- [x] Abordagem mais simples: uma tela com dois campos sobre a política e o trigger que já existem.
- [x] Sem dependência nova.
- [x] Touch List respeitada, com o desvio registrado acima.

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] Página `meu-perfil.html`
- **Estimativa:** 2 h
- **Critério de conclusão:** só cliente logado (visitante vai ao login com `?voltar=`, profissional vai para a tela dele); mostra e edita nome e telefone (critério 1); validações (critério 2); confirmação ao salvar (critério 3); 360px, toque de 44px, labels e foco visível (critérios 6 e 7).

#### [TASK-002] Link "Meu perfil" no menu do cliente
- **Estimativa:** 0,5 h
- **Critério de conclusão:** link em `home-cliente.html` e `contratacoes.html`, visível só para cliente logado (critério 3).

#### [TASK-003] `telefoneValido` compartilhado
- **Estimativa:** 0,25 h
- **Critério de conclusão:** a mesma função em `telefone.js` é usada por cadastro e perfil.

### Testing Tasks

#### [TASK-004] Testes
- **Estimativa:** 0,75 h
- **Critério de conclusão:** roteiro abaixo executado no Supabase real; dados de teste restaurados ao final. MP-08 e MP-09 em `supabase/testes/us012_meu_perfil.sql` (desfaz tudo ao final).

---

## Roteiro de Testes (escrito antes da implementação)

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| MP-01 | Visitante abre `meu-perfil.html` | Vai para `index.html?voltar=meu-perfil.html` | Review |
| MP-02 | Profissional abre `meu-perfil.html` | Vai para a tela do profissional | Review |
| MP-03 | Cliente abre a tela | Nome e telefone atuais preenchidos | Review |
| MP-04 | Nome vazio / telefone `1234` | Erro no campo, nada é gravado | Review |
| MP-05 | Salvar nome e telefone válidos, recarregar | Confirmação; valores continuam depois de recarregar | Done |
| MP-06 | Apagar o telefone e salvar | Grava `null` (telefone é opcional) | Review |
| MP-07 | Menu | "Meu perfil" aparece na home e em `contratacoes.html` para cliente; não aparece para visitante nem profissional | Review |
| MP-08 | Console: `update usuarios set tipo_usuario = 'profissional'` pelo cliente | Recusado pelo trigger `proteger_usuario` | Done |
| MP-09 | Profissional numa contratação aceita com o cliente | `contato_contraparte` devolve o telefone novo | Done |
| MP-10 | 360px e navegação só por Tab | Sem rolagem horizontal; foco visível; botões de 44px | Review |
| MP-11 | Cadastro com telefone de 12 dígitos sem 55 | Erro no campo (nova regra) | Review |

---

## Ordem de Execucao Sugerida

TASK-003 → TASK-001 → TASK-002 → TASK-004.
