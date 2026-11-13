# Task Breakdown: [US-017] Painel de indicadores do administrador

**Data:** 2026-11-13
**Participantes:** Bruno Alves
**Estimativa total:** 5 pontos (~6 h)
**Nivel ScrumAIDev:** 0
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A (erros traduzidos por `js/admin-comum.js`; falha nos indicadores não esconde o resto do painel)
**BDD associado:** N/A
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicação no GitHub dispensada pelo PO em 2026-11-06)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Não
- **US exige Contract governado?** Não
- **Justificativa do Nivel ScrumAIDev:** leitura agregada, sem regra de estado. A segurança fica em `painel_admin()` (`exigir_admin()`), coberta por `supabase/testes/006_painel.sql`.
- **Touch List aplicável:** `supabase/migrations/006_painel.sql` (novo), `supabase/testes/006_painel.sql` (novo), `helpme-app/admin.html`, `helpme-app/js/admin.js`, `helpme-app/assets/css/admin.css`, `supabase/README.md`.
- **Desvios da story:** a story previa a função na `003_admin.sql` ou numa `005_painel.sql`. Os números 003 a 005 já estão usados, então ela vai na `006_painel.sql` (D7).
- **Base da branch:** `feat/US-016-triagem` (usa `categorias.ativa` da 005 e `analises_profissional` da 004).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Fonte única | `rpc('painel_admin')` devolve um `jsonb` só com totais (NFR09). O único texto que sai são nomes de categorias, que são catálogo público. |
| Usuários por tipo | Clientes (sem contar admins), profissionais (e quantos ainda sem perfil) e administradores. |
| Fila | Tamanho, divisão pela última triagem (verde/pendência/suspeito/sem), espera média de quem está na fila **agora** e tempo médio até a decisão nos últimos 30 dias. O início da fila é o mesmo da `fila_analise()`: último reenvio ou cadastro. |
| Contratações | Criadas nos últimos 7 e 30 dias, pelo status atual. |
| Taxa de aceite | Últimos 30 dias: aceitas (aceita + concluída) ÷ respondidas (aceita + recusada + concluída). Cancelada e solicitada não entram, porque o profissional não respondeu. Sem respondidas = "—". |
| Categorias | Ativas sem nenhum profissional aprovado, com os nomes. O link para a tela de categorias entra com a US-018 (hoje a tela não existe). |
| Forma (skill dataviz) | Stat tiles (rótulo, número em tinta de texto, nota) e uma tabela para status × período. Sem gráfico e sem biblioteca (NFR03); a cor não carrega dado, então não há paleta de série para validar. |
| Falhas | O painel abre mesmo se os indicadores falharem: aviso só na seção, com o texto traduzido; `PGRST202` avisa que falta a migration 006. |

---

## Checagem de Principios (condicional)

- [x] Uma função e uma seção de tela; sem dependência nova.
- [x] Touch List respeitada, com o desvio registrado acima.

---

## Tasks Tecnicas

#### [TASK-001] `painel_admin()` (`006_painel.sql`) + roteiro `supabase/testes/006_painel.sql`
- **Estimativa:** 3 h
- **Critério de conclusão:** critérios 2, 3 e 5; P1–P12 com "ok" no banco real.

#### [TASK-002] Indicadores em `admin.html`
- **Estimativa:** 3 h
- **Critério de conclusão:** critérios 1, 4, 6, 7 e 8.

---

## Roteiro de Testes

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| P1–P3 | Cliente, profissional e visitante chamam `painel_admin()` | Erro de permissão (critério 3) | Done |
| P4–P8 | Números do painel × contagem direta no banco | Iguais (usuários, status, fila, contratações 7d/30d, categorias) | Done |
| P9 | Conteúdo do retorno | Sem id, e-mail ou telefone (NFR09) | Done |
| P10 | Sem contratações | Zeros e taxa vazia (critério 5) | Done |
| P11–P12 | 6 contratações conhecidas (uma com 40 dias) | Taxa 3/4 = 75%; 7d = 4, 30d = 5 | Done |
| I1–I21 | Tela (login real de admin, RPC simulada) | Valores formatados, tile da fila leva à fila, vazio sem erro, aviso sem a 006, 42501 traduzido, 360px, 44px, foco, nome de categoria com HTML vira texto, sem erro de JS | Review |

**Resultados (2026-11-13):** tela **21/21**; regressão do `admin.html` (ponta a ponta da US-014) **9/9**. Roteiro SQL e ponta a ponta aguardando a `006` ser aplicada pelo PO.
