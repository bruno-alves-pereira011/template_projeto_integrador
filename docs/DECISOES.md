# Decisões do MVP — Marco 2

Registro das decisões tomadas pela equipe antes da implementação (Fase 0 do `BRIEFING.md`).
Data: 09/10/2026.

| # | Tema | Decisão | Consequência |
|---|------|---------|--------------|
| D1 | Escopo do MVP | **Diretório + contato** (HU01–HU03 do README) é o fluxo principal; o **fluxo de pedidos** (estilo "Uber") é mantido como **extra**. | O modelo de dados inclui a tabela `pedidos`. As telas de pedido (`solicitar-pedido`, `espera-cliente`, `servico-andamento`, `feed-profissional`) continuam, mas o README precisa documentá-las como funcionalidade extra. |
| D2 | Aprovação de profissional | **Manual**, feita por alguém da equipe pelo Table Editor do Supabase. | `profissionais.status_aprovacao` começa como `'pendente'`. O RLS impede o próprio usuário de alterar esse campo. Profissional pendente/recusado cai em `bloqueio.html` no login. |
| D3 | Projeto Supabase | URL correta: `https://btjjbtjxcbvswgezpwgc.supabase.co` (o código usava `.supabase.com`). O banco **pode ser recriado** — não há dados a preservar. | A migration `001_schema.sql` pode dropar e recriar as tabelas. |
| D4 | Arquivos de template em `arquivos/` | **Não apagar.** | `personas_academia.png`, `us_academia.png`, `concept_sample.png`, `TabelaEmpresaDevCom_sample.xlsx` e `EmpresaDevcom .pdf` permanecem no repositório. |
| D5 | Contratação no app | A **contratação direta pelo perfil** do profissional substitui o pedido aberto para a categoria (estilo "Uber"). O Marco 2 inclui **data/horário desejado** e **chat** entre cliente e profissional. **Orçamento e pagamento simulado** ficam para o Marco 3; **gateway de pagamento real** fica fora do escopo. O **diretório é público**; o login só é exigido para contratar. | `pedidos` sai do modelo e entram `contratacoes` (status `solicitada → aceita/recusada/cancelada → concluida`) e `mensagens`, ambas com RLS só das partes e Realtime. Contato do cliente só aparece ao profissional após o aceite (função `contato_contraparte`). As telas `solicitar-pedido`, `espera-cliente`, `servico-andamento` e `feed-profissional` são substituídas pelas telas de contratação. Requisitos: `docs/requirements/helpme-mvp-marco2.md` rev. 2 (FR10–FR14, BR04–BR10, NFR07). |
