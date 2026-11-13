# Task Breakdown: [US-014] Papel de administrador e área admin

**Data:** 2026-11-13
**Participantes:** Bruno Alves (responsáveis na Sprint 03: Lucas dos Santos Felipe e Davi Souza)
**Estimativa total:** 5 pontos (~8 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual — cenários de BR11)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06, mantida no planejamento da Sprint 03)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** cria um papel com privilégio e altera um trigger de segurança. A regra fica versionada em SQL (`003_admin.sql`) e coberta pelo roteiro `supabase/testes/003_admin.sql` (NFR11) e pelos cenários BDD de BR11.
- **Justificativa:** sem API própria; o boundary é o Supabase protegido por RLS.
- **Touch List aplicável:** `supabase/migrations/003_admin.sql` (novo), `supabase/testes/003_admin.sql` (novo), `supabase/README.md`, `helpme-app/js/sessao.js`, `helpme-app/admin.html` (novo), `helpme-app/js/admin.js` (novo), `helpme-app/assets/css/admin.css` (novo).
- **Desvio da Touch List da story:** `admin.css` novo, para não mexer no `dashboard.css` das outras telas.
- **DEBT-005:** `refactor/ui-polish` **descartado por agora** (decisão do PO em 2026-11-13). As telas admin seguem o CSS atual.
- **Runner BDD / contrato / mock:** N/A (revisão manual).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| `administradores` | RLS ligado, **nenhuma política** e privilégios de `anon`/`authenticated` revogados. Ninguém lê nem escreve pelo app; só o SQL Editor (A09). |
| `eh_admin()` | `security definer`, `stable`, `search_path = public`, sem parâmetro (só responde sobre quem chama). `execute` para `anon` também (responde false), para não quebrar políticas futuras em tabelas públicas. |
| `validar_profissional` | `create or replace` com uma única mudança: no UPDATE pelo app, a troca de status passa se `eh_admin()`. O trigger do `001` continua apontando para a função. |
| Critério 4 | Já atendido pelo `handle_new_user` do `001` (tipo inválido vira `cliente`). Só ganhou teste (C4a/C4b). |
| Ordem no login | `destinoDoUsuario` pergunta `eh_admin` antes da regra de cliente/profissional. Admin só segue `?voltar=` para outra `admin*.html`. |
| Migration ainda não aplicada | Se `eh_admin` não existir (`PGRST202`), ninguém é admin e o login dos outros continua funcionando. O front pode ir para a `main` antes do banco. |
| Menu | "Fila de análise" e "Categorias" aparecem como "em breve" (sem link) até a US-015 e a US-018 criarem as telas. |
| Primeiro admin | `admin@helpme.test` (decisão do PO em 2026-11-13), criado pelo painel com Auto Confirm e cadastrado em `administradores` pelo SQL Editor (`supabase/README.md`). |

### Para a US-015

- O RLS de `profissionais` ainda só deixa cada um ler/editar a própria linha (e ler os aprovados). Ler a fila de pendentes e decidir sobre outros profissionais fica nas políticas e funções de decisão da US-015, com registro em `analises_profissional` (BR19).
- Decidir se um admin que também é profissional pode aprovar o próprio cadastro (hoje o trigger deixaria, pela linha própria).

---

## Checagem de Principios (condicional)

Aplicável (Nível 1 e `Behavior change` = YES).

- [x] Abordagem mais simples: uma tabela, uma função e uma linha a mais no trigger; no front, uma chamada `rpc('eh_admin')`.
- [x] Sem dependência nova.
- [x] Touch List respeitada, com o desvio registrado acima.

**Complexidade Aceita:**

| Desvio | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Tratar `PGRST202` como "não é admin" | Front e banco são publicados separadamente | Sem isso, o login de todos quebraria até alguém aplicar o `003` |

---

## Tasks Tecnicas

### Database Tasks

#### [TASK-001] Migration 003 (tabela, `eh_admin()`, trigger)
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 1 e 5; autoconferência no fim do script; incremental (D7).

#### [TASK-002] Roteiro de testes `supabase/testes/003_admin.sql`
- **Estimativa:** 1,5 h
- **Critério de conclusão:** C1a–C1f, C4a–C4b, C5a–C5c com "ok" no banco real; README explica o primeiro admin (critério 6).
- **Resultado (2026-11-13):** 11/11 ok no Supabase real, executado pelo PO no SQL Editor depois de aplicar a `003`.

### Frontend Tasks

#### [TASK-003] Destino admin e `exigirSessao('admin')` em `sessao.js`
- **Estimativa:** 1,5 h
- **Critério de conclusão:** critérios 2 e 3; `calcularDestino` continua pura.

#### [TASK-004] Casca `admin.html` com menu e Sair
- **Estimativa:** 1,5 h
- **Critério de conclusão:** menu Painel, Fila de análise, Categorias e Sair; estados de carregando e erro; 360px, toque de 44px, foco visível (critérios 7 a 9).

### Testing Tasks

#### [TASK-005] Testes de tela e aplicação no banco real
- **Estimativa:** 1,5 h
- **Critério de conclusão:** roteiro abaixo; migration aplicada só depois do OK do PO; `admin@helpme.test` criado e testado de ponta a ponta.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| C1a–C1f | `supabase/testes/003_admin.sql` | Cliente não se torna admin, não lê `administradores`; admin não se remove; `eh_admin()` false para cliente e visitante, true para admin | Done |
| C4a–C4b | Cadastro com `tipo_usuario = 'admin'` | Vira cliente, sem acesso admin | Done |
| C5a–C5c | Profissional muda o próprio status | Recusado; continua pendente; como admin, aceito | Done |
| U1–U4 | Regra pura (`calcularDestino`, `ehPaginaAdmin`) | Admin → `admin.html`; só segue voltar admin* | Review |
| A1 | Visitante abre `admin.html` | `index.html?voltar=admin.html` | Review |
| A2 | Cliente entra / abre `admin.html` | Home do cliente (inclusive com a `003` ainda não aplicada) | Review |
| A3 | Profissional abre `admin.html` | `contratacoes.html` | Review |
| A4 | Admin entra | `admin.html` com menu e saudação; 360px; 44px; foco; Sair | Review (simulado) / Done (`admin@helpme.test` real) |
| A5 | Admin entra a partir de `admin.html` | Volta para `admin.html` | Review |
| A6 | Falha ao consultar `eh_admin` | Tela de erro sem conteúdo admin; "Tentar novamente" funciona | Review |

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-002 (transação desfeita) → TASK-003 → TASK-004 → OK do PO → aplicar `003` → criar `admin@helpme.test` → TASK-005.
