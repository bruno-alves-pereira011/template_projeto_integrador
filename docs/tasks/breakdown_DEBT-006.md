# Task Breakdown: [DEBT-006] Remover o legado de pedidos

**Data:** 2026-10-23
**Participantes:** a definir (responsavel nao nomeado na Sprint 02)
**Estimativa total:** 1 ponto (~1 h)
**Nivel ScrumAIDev:** 0
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** N/A
**Behavior change:** NO
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicacao no GitHub pendente de decisao da equipe)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Nao
- **US exige Contract governado?** Nao
- **Justificativa do Nivel ScrumAIDev:** remocao de codigo morto, sem regra de negocio nova; nivel 0 basta.
- **Justificativa:** a decisao D5 substituiu o pedido aberto para a categoria pela contratacao direta. A tabela `pedidos` nao existe mais no banco (`001_schema.sql`), entao `feed-profissional.html` + `js/profissional.js` quebram ao carregar; `solicitar-pedido.html`, `espera-cliente.html` e `servico-andamento.html` so tem comentarios. Nenhuma pagina do roteamento atual (`js/sessao.js`) leva a elas.
- **Touch List aplicavel:** `helpme-app/feed-profissional.html`, `helpme-app/js/profissional.js`, `helpme-app/solicitar-pedido.html`, `helpme-app/espera-cliente.html`, `helpme-app/servico-andamento.html` (removidos); `helpme-app/js/sessao.js` (so comentario).
- **Runner BDD a executar:** N/A
- **Validacao de contrato a executar:** N/A
- **Teste de contrato a executar:** N/A
- **Teste de mock a executar:** N/A

---

## Checagem de Principios (condicional)

Nao aplicavel (Nivel 0, `Behavior change` = NO, 1 ponto).

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] Remover as 5 paginas/scripts do fluxo de pedidos
- **Estimativa:** 0,25 h
- **Dependencias:** nenhuma
- **Criterio de conclusao:** os 5 arquivos da Touch List deixam de existir no repositorio.

#### [TASK-002] Limpar referencias restantes
- **Estimativa:** 0,25 h
- **Dependencias:** TASK-001
- **Criterio de conclusao:** busca por `feed-profissional`, `js/profissional.js`, `solicitar-pedido`, `espera-cliente`, `servico-andamento` em `helpme-app/` nao encontra link nem `<script>`; o comentario de `js/sessao.js` nao cita mais o arquivo removido.
- **Fora do escopo (decidido):** os estilos `.grade-pedidos` / `.card-pedido` de `assets/css/dashboard.css` ficam. A branch `refactor/ui-polish` reescreve esse arquivo inteiro (DEBT-005) e os estilos podem ser reaproveitados nos cards de contratacao da US-008; limpar agora so geraria conflito.

### Testing Tasks

#### [TASK-003] Teste manual
- **Estimativa:** 0,5 h
- **Dependencias:** TASK-002
- **Criterio de conclusao:** com Live Preview, `home-cliente.html`, `profissionais.html`, `profissional.html`, `index.html`, `cadastro.html`, `completar-perfil.html` e `bloqueio.html` abrem sem erro no console e sem link quebrado; login de profissional aprovado continua levando a `completar-perfil.html?aprovado=1`.

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-002 → TASK-003.

---

## Notas

- Nao depende do DEBT-004: os arquivos removidos sao os mesmos na `main` e na `fix/sprint01-fechamento`, e nenhuma das duas branches os altera.
