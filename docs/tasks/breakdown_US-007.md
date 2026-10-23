# Task Breakdown: [US-007] Contratar profissional pelo perfil

**Data:** 2026-10-23
**Participantes:** a definir (responsavel nao nomeado na Sprint 02)
**Estimativa total:** 5 pontos (~6 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** `docs/bdd/contratacao.feature` (revisao manual — cenarios de BR09 e BR10)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicacao no GitHub pendente de decisao da equipe)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Nao
- **US exige Contract governado?** Nao
- **Justificativa do Nivel ScrumAIDev:** regra de negocio e controle de acesso ja estao no banco (`contratacoes`: RLS "cliente contrata profissional aprovado" + trigger `validar_contratacao`); o front so consome. Nivel 1 com BDD de revisao manual basta.
- **Justificativa:** sem API propria; o boundary e o Supabase (PostgREST) com RLS. Nenhuma mudanca de banco (D7).
- **Touch List aplicavel:** `helpme-app/profissional.html`, `helpme-app/js/perfil-profissional.js`, `helpme-app/contratar.html` (novo), `helpme-app/js/contratar.js` (novo), `helpme-app/assets/css/contratacao.css` (novo). O stub `solicitar-pedido.html` ja sai no DEBT-006.
- **Runner BDD a executar:** N/A (revisao manual)
- **Validacao de contrato a executar:** N/A
- **Teste de contrato a executar:** N/A
- **Teste de mock a executar:** N/A

---

## Checagem de Principios (condicional)

Aplicavel (`Behavior change` = YES).

- [x] Abordagem mais simples: um link "Contratar" no perfil + uma pagina de formulario que faz um `insert` em `contratacoes`. O retorno do visitante apos o login reaproveita o `?voltar=` que `exigirSessao()` ja monta.
- [x] Alinhada com a DoD e o `AGENTS.md`: sem mudanca de banco, sem dependencia nova, codigo no padrao das telas existentes (IIFE, `textContent`, erros por campo).
- [x] Nenhuma dependencia externa nova.
- [x] Touch List respeitada (sem Spec governada; Touch List da story).

**Complexidade Aceita:**

| Desvio | Por que e necessario | Alternativa mais simples rejeitada porque |
|---|---|---|
| Novo `assets/css/contratacao.css` | `input[type="datetime-local"]` nao tem estilo; `global.css` e `auth.css` estao sendo reescritos na `refactor/ui-polish` (DEBT-005) | Editar o bloco de inputs do `global.css` conflitaria com a `refactor/ui-polish` no mesmo trecho |
| Tela de sucesso na propria `contratar.html` | O criterio 4 manda para `contratacao.html?id=`, que so nasce na US-009 | Redirecionar para uma pagina inexistente quebraria o fluxo; a troca fica marcada como TEMPORARIO no codigo |

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] Botao "Contratar" com regra de exibicao
- **Estimativa:** 1 h
- **Dependencias:** nenhuma
- **Criterio de conclusao:** em `profissional.html`, o link aparece para visitante e cliente e nao aparece para profissional logado (criterio 1). Usa `buscarUsuario()` do `sessao.js` (passa a ser carregado na pagina).

#### [TASK-002] Pagina `contratar.html` + `js/contratar.js`
- **Estimativa:** 3 h
- **Dependencias:** TASK-001
- **Criterio de conclusao:** `exigirSessao('cliente')` (visitante → login → volta; criterio 2); mostra o profissional (so aprovados, via `profissionais_publicos`); formulario com descricao, endereco e data/horario obrigatorios e data no futuro (criterio 3); `insert` em `contratacoes` e confirmacao com status `solicitada` (criterio 4, com a ressalva da tabela acima); erros do banco traduzidos (criterio 5).

#### [TASK-003] Estilo do campo de data/horario
- **Estimativa:** 0,5 h
- **Dependencias:** TASK-002
- **Criterio de conclusao:** `contratacao.css` com o `datetime-local` igual aos outros campos; 360px sem rolagem horizontal (criterio 6).

### Testing Tasks

#### [TASK-004] Testes manuais e BDD
- **Estimativa:** 1,5 h
- **Dependencias:** TASK-001 a TASK-003
- **Criterio de conclusao:** roteiro "Como testar" do PR executado no Supabase real; cenarios de BR09/BR10 de `docs/bdd/contratacao.feature` conferidos; console tentando burlar (profissional contratando, profissional pendente, data no passado) recebe erro do banco.

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-002 → TASK-003 → TASK-004.

---

## Sugestoes IA

### Possiveis Bloqueadores

- Quem confirma o e-mail pelo link volta para `index.html?confirmado=1` e perde o `?voltar=` (limitacao ja existente do cadastro); depois do login cai na home, nao no formulario.
- `contratacoes.descricao` e `endereco` nao tem limite de tamanho no banco; o front limita (1000 e 200 caracteres). Um limite no banco exigiria migration `003_*` (D7) — registrar como sugestao, fora desta US.
