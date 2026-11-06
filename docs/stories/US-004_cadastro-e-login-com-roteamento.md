# User Story: [US-004] Cadastro e login com roteamento por tipo

**Epic:** EPIC-003 Conta e acesso
**GitHub Epic Issue:** -
**GitHub US Issue:** -
**Prioridade:** Alta
**Story Points:** 5
**Sprint:** 01
**Status:** Review
**Behavior Change Esperado:** YES

---

## Historia

**Como** cliente ou profissional
**Eu quero** me cadastrar e entrar, sendo levado automaticamente a tela certa para o meu tipo e situacao
**Para que** usar as areas do app que dependem de conta

### Contexto Adicional

Corrige os bugs B2/B3 e a inconsistencia de modelo: o `signUp` envia `nome` e `tipo_usuario` em `options.data` (o trigger cria `usuarios`). Cria o helper unico `exigirSessao(tipoEsperado)` e o logout. Trata confirmacao de e-mail ativa (`signUp` sem sessao).

- **Requisitos de origem:** FR05, FR07, FR09, BR05 (`docs/requirements/helpme-mvp-marco2.md`)
- **Dependencias:** US-001
- **Repositorio de codigo:** `template_projeto_integrador/` (branch de trabalho a partir de `feat/mvp-marco2`)

### Pontos de Esclarecimento

- Nenhum ponto pendente.

---

## Criterios de Aceitacao

- [ ] **Criterio 1:** O cadastro pede nome, e-mail, senha e tipo (cliente/profissional) e cria a linha em `usuarios` com o tipo escolhido.
- [ ] **Criterio 2:** Se o `signUp` voltar sem sessao (confirmacao de e-mail ativa), a tela mostra "Confirme seu e-mail para entrar" e nao tenta gravar mais nada.
- [ ] **Criterio 3:** Login roteia: cliente → `home-cliente.html` (ou a URL de retorno `?voltar=`, se houver); profissional sem linha em `profissionais` → `completar-perfil.html`; profissional pendente/recusado → `bloqueio.html`; profissional aprovado → `contratacoes.html`.
- [ ] **Criterio 4:** `exigirSessao(tipo)` em `js/sessao.js` e o unico mecanismo de protecao de pagina: sem sessao → login com `?voltar=`; tipo errado → pagina inicial do seu tipo.
- [ ] **Criterio 5:** Toda pagina protegida tem botao "Sair" que encerra a sessao e volta para a home.
- [ ] **Criterio 6:** Mensagens claras para e-mail ja cadastrado, senha fraca (menos de 6 caracteres) e credenciais invalidas.
- [ ] **Criterio 7:** **Mobile (NFR04):** a tela funciona sem rolagem horizontal em 360px de largura e botoes tem area de toque de pelo menos 44px.
- [ ] **Criterio 8:** **Acessibilidade (NFR05):** campos tem `<label>`, foco visivel em todos os elementos interativos e texto com contraste adequado.
- [ ] **Criterio 9:** **Seguranca (NFR01):** nenhum dado fixo/demo e nenhuma `service_role` no front; toda leitura/escrita passa pelo RLS.

---

## Governanca e Rastreabilidade

- **Nivel ScrumAIDev:** 0
- **Justificativa do nivel:** Story de tela/fluxo sem regra de estado critica; rastreabilidade via requisitos basta.
- **US exige Spec governada?** Nao
- **Justificativa da Spec:** Regras ja estao em `docs/requirements/helpme-mvp-marco2.md` e no SQL versionado; front estatico sem API propria.
- **Spec prevista:** N/A
- **US exige Contract governado?** Nao
- **Justificativa do Contract:** Nao ha API propria; o boundary e o Supabase (PostgREST) protegido por RLS, documentado em `template_projeto_integrador/supabase/`.
- **Contract previsto:** N/A
- **Padrao de erro aplicavel:** N/A
- **BDD previsto:** N/A
- **Gates opcionais aplicaveis:** N/A (sem runner de testes no projeto)
- **Touch List preliminar:** template_projeto_integrador/helpme-app/index.html, template_projeto_integrador/helpme-app/cadastro.html, template_projeto_integrador/helpme-app/js/auth.js, template_projeto_integrador/helpme-app/js/sessao.js (novo)
- **Task Issues previstas:** N/A

---

## Mockups/Wireframes

Seguir o padrao visual atual (`global.css`, `auth.css`, `dashboard.css`, cards com `<template>`) e os prototipos da secao 6 do README do projeto.

---

## Notas Tecnicas

### Arquitetura

- **Componentes afetados:** ver Touch List.
- **APIs necessarias:** Supabase JS v2 via CDN (Auth/PostgREST).
- **Database changes:** Nenhuma (trigger `on auth.users insert` ja existe).
- **Referencias do modelo de dados:** `template_projeto_integrador/supabase/migrations/001_schema.sql`
- **Erros observaveis esperados:** mensagens amigaveis na tela para falha de rede/RLS; detalhes so no console.

### Dependencias

- [ ] US-001

### Consideracoes de Performance

- Consultas filtradas no banco (nao carregar tabelas inteiras); listas pequenas no MVP.

---

## Plano de Testes

### Testes Unitarios

- [ ] N/A (sem runner no projeto — funcoes puras como normalizacao de telefone testadas manualmente no console)

### Testes de Integracao

- [ ] N/A

### Testes de Contract

- [ ] N/A

### Testes Manuais

- [ ] Cadastrar cliente novo → entra na home.
- [ ] Logar com cada usuario do seed → destino correto.
- [ ] Abrir `contratacoes.html` deslogado → vai ao login e volta apos entrar.
- [ ] Criterios comuns de mobile/acessibilidade verificados (DevTools 360px, navegacao por Tab).

### BDD / Cenarios de Comportamento

- [ ] N/A

---

## Tasks (Breakdown)

- [ ] **[TASK-001]** Reescrever cadastro com `options.data`
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-002]** Login com roteamento por tipo/status
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-003]** Helper `exigirSessao` + logout
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -
- [ ] **[TASK-004]** Tratamento de confirmacao de e-mail e mensagens de erro
  - GitHub Task Issue: N/A
  - Estimativa: -
  - Assignee: -

---

## IA Insights

### Sugestoes de Implementacao

`?voltar=` deve aceitar so caminhos relativos do proprio app (evita open redirect).

### Riscos Identificados

Configuracao de confirmacao de e-mail no projeto Supabase muda o fluxo — testar os dois modos.

### Alternativas Consideradas

Ver `docs/requirements/helpme-mvp-marco2.md` (Key Decisions) — alternativas descartadas: pedido aberto para a categoria, pagamento com gateway real.

---

## Notas e Comentarios

- 2026-10-09: story gerada no Modo Backlog a partir de `docs/requirements/helpme-mvp-marco2.md` (rev. 2), aprovada pelo usuario.

---

## Definition of Done Checklist

- [ ] Codigo implementado conforme criterios de aceitacao
- [ ] Decisao sobre Spec governada foi registrada
- [ ] Decisao sobre Contract governado foi registrada
- [ ] Nivel ScrumAIDev foi registrado
- [ ] Spec, Contract e BDD foram atualizados quando aplicavel
- [ ] Gates opcionais executados ou dispensados com justificativa
- [ ] Error handling observavel segue o padrao compartilhado quando aplicavel
- [ ] Code review aprovado
- [ ] Testes unitarios com cobertura adequada (N/A — sem runner; dispensado)
- [ ] Testes de integracao e contract passando (N/A — dispensado)
- [ ] Documentacao atualizada
- [ ] Build/CI passando (N/A — sem build)
- [ ] `Behavior change` documentado no PR
- [ ] Aprovacao do Product Owner
