# Task Breakdown: [US-015] Fila de análise e aprovação de profissionais

**Data:** 2026-11-13
**Participantes:** Bruno Alves (responsáveis na Sprint 03: Lucas dos Santos Felipe e Luiz Felipe Moro)
**Estimativa total:** 5 pontos (~9 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (erros do banco com `errcode` 42501 / 22023, traduzidos em `js/admin-comum.js`)
**BDD associado:** `docs/bdd/aprovacao_profissionais.feature` (revisão manual — BR15, BR16, BR19)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** máquina de aprovação com controle de acesso e histórico auditável. As regras ficam versionadas em SQL (`004_fila_analise.sql`) e cobertas por `supabase/testes/004_fila_analise.sql` (NFR11) e pelos cenários BDD.
- **Touch List aplicável:** `supabase/migrations/004_fila_analise.sql` (novo), `supabase/testes/004_fila_analise.sql` (novo), `supabase/testes/003_admin.sql` (C5c), `supabase/README.md`, `helpme-app/admin-analise.html` + `js/admin-analise.js` (novos), `helpme-app/admin-profissional.html` + `js/admin-profissional.js` (novos), `helpme-app/js/admin-comum.js` (novo), `helpme-app/admin.html`, `helpme-app/assets/css/admin.css`.
- **Desvios da story:**
  - A story previa tudo dentro da `003_admin.sql`. A `003` já foi aplicada no banco real, então pela D7 a US-015 vai numa migration nova, a `004_fila_analise.sql`. Se o DEBT-009 entrar antes, ela recebe o próximo número livre.
  - A story previa políticas de SELECT do admin em `usuarios`, `profissionais` e `profissional_categoria`. No lugar delas entram **funções `security definer`** (`fila_analise`, `detalhe_profissional_admin`), que devolvem só as colunas usadas. Isso atende o risco anotado na própria story ("políticas de leitura do admin amplas demais"): o admin não lê telefone de cliente nem `mensagens` (BR21).
- **Base da branch:** `feat/US-014-admin` (depende de `sessao.js` e `admin.html` da US-014, ainda fora da `main`).
- **Runner BDD / contrato / mock:** N/A (revisão manual).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| `analises_profissional` | `acao` ∈ triagem / aprovacao / recusa / reenvio; `resultado` só na triagem; `checagens jsonb` no formato combinado com a US-016; `autor_id` nulo = sistema; `check` do motivo da recusa (10–500). RLS sem políticas e privilégios revogados: só as funções escrevem e leem (BR19, NFR10). |
| Decisão | `decidir_profissionais(ids, acao, motivo, exigir_verde)` numa única chamada. Trava cada linha (`for update`), só decide `pendente`, no lote exige a última triagem verde (BR15) e devolve aprovados e ignorados com o motivo. Recusa: um por vez e motivo de 10 a 500 caracteres (BR16). |
| Concorrência (critério 5) | A segunda decisão encontra o status já alterado e volta como `ignorado` ("Já foi decidido"). A tela avisa e recarrega. |
| Admin e o próprio cadastro | **Não decide o próprio cadastro** (padrão seguro, adotado em 2026-11-13 sem resposta do PO à pergunta; reversível). A função ignora o próprio cadastro e o `validar_profissional` recusa que um admin mude o próprio status pela API. Com isso, toda mudança de status pelo app passa pela função e fica no histórico (NFR10). |
| Tempo na fila | Desde o último `reenvio` (US-013) ou, se não houver, desde o cadastro. |
| Sem triagem (antes da US-016) | A fila mostra "Sem triagem"; a caixa de seleção do lote fica desabilitada; aprovação e recusa individuais funcionam pelo detalhe. |
| Idade no detalhe | Em anos, calculada no banco. A data de nascimento continua oculta (002). |

---

## Checagem de Principios (condicional)

Aplicável (Nível 1 e `Behavior change` = YES).

- [x] Abordagem mais simples que atende BR15/BR16/BR19 com segurança: uma tabela e três funções; duas telas.
- [x] Sem dependência nova.
- [x] Touch List respeitada, com os desvios registrados acima.

**Complexidade Aceita:**

| Desvio | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Funções de leitura em vez de políticas | Limitam as colunas e não liberam linhas inteiras de `usuarios` | Política em `usuarios` expõe telefone de clientes a qualquer admin |
| `for update` por linha | Critério 5 (dois admins ao mesmo tempo) | Sem trava, as duas decisões poderiam passar |

---

## Tasks Tecnicas

### Database Tasks

#### [TASK-001] `analises_profissional` + funções de leitura e decisão (`004_fila_analise.sql`)
- **Estimativa:** 3 h
- **Critério de conclusão:** critérios 3 a 7 no banco; autoconferência no fim do script.

#### [TASK-004] Roteiro `supabase/testes/004_fila_analise.sql` (+ ajuste do C5c do `003`)
- **Estimativa:** 1,5 h
- **Critério de conclusão:** F1–F8 com "ok" no banco real.

### Frontend Tasks

#### [TASK-002] Fila com filtro e seleção em lote (`admin-analise.html`)
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 1 e 4; 360px, 44px, foco visível, labels (8 a 10).

#### [TASK-003] Detalhe com triagem, histórico e ações (`admin-profissional.html`)
- **Estimativa:** 2 h
- **Critério de conclusão:** critérios 2, 3 e 5.

### Testing Tasks

#### [TASK-005] Testes de tela
- **Estimativa:** 0,5 h
- **Critério de conclusão:** roteiro abaixo; depois da 004 aplicada, teste ponta a ponta com `admin@helpme.test`.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| F7a–F7d | Cliente, profissional e visitante chamam as funções | Erro de permissão (critério 7) | Done |
| F1a–F1c | Fila | prof3 sem triagem; aprovados fora; motivo da triagem aparece | Done |
| F2 | Detalhe | Sem `data_nascimento`; com histórico | Done |
| F3a–F3e | Recusa curta / em lote / aprovar / diretório / recusa válida | Recusada / recusada / aprovado / aparece em `profissionais_publicos` / motivo gravado | Done |
| F4 | Lote [verde, suspeito, aprovado] | Só o verde é aprovado; os outros, ignorados com motivo | Done |
| F5 | Segunda decisão sobre o mesmo cadastro | Ignorada ("Já foi decidido") | Done |
| F6a–F6d | Histórico | Autor = admin; app não lê, altera, apaga nem insere | Done |
| F8a–F8b | Admin que também é profissional | Não decide o próprio cadastro, nem pela função nem direto | Done |
| Q1–Q9 | Tela da fila (RPC simulada) | Lista, selos, motivos, filtro, lote só verde, resultado, vazio, erro 42501, 360px, 44px, foco, XSS como texto | Review |
| D1–D9 | Tela do detalhe (RPC simulada) | Perfil, triagem, histórico, recusa com motivo, aviso de concorrência, id inválido, 360px, 44px, foco | Review |

---

## Ordem de Execucao Sugerida

TASK-001 → TASK-004 → TASK-002 → TASK-003 → OK do PO → aplicar `004` → TASK-005 (ponta a ponta).
