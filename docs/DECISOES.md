# Decisões do MVP — Marco 2

Registro das decisões tomadas pela equipe antes da implementação (Fase 0 do `BRIEFING.md`).
Data: 09/10/2026.

| # | Tema | Decisão | Consequência |
|---|------|---------|--------------|
| D1 | Escopo do MVP | **Diretório + contato** (HU01–HU03 do README) é o fluxo principal; o **fluxo de pedidos** (estilo "Uber") é mantido como **extra**. | O modelo de dados inclui a tabela `pedidos`. As telas de pedido (`solicitar-pedido`, `espera-cliente`, `servico-andamento`, `feed-profissional`) continuam, mas o README precisa documentá-las como funcionalidade extra. |
| D2 | Aprovação de profissional | **Manual**, feita por alguém da equipe pelo Table Editor do Supabase. | `profissionais.status_aprovacao` começa como `'pendente'`. O RLS impede o próprio usuário de alterar esse campo. Profissional pendente/recusado cai em `bloqueio.html` no login. |
| D3 | Projeto Supabase | URL correta: `https://btjjbtjxcbvswgezpwgc.supabase.co` (o código usava `.supabase.com`). O banco **pode ser recriado** — não há dados a preservar. | A migration `001_schema.sql` pode dropar e recriar as tabelas. |
| D4 | Arquivos de template em `arquivos/` | **Não apagar.** | `personas_academia.png`, `us_academia.png`, `concept_sample.png`, `TabelaEmpresaDevCom_sample.xlsx` e `EmpresaDevcom .pdf` permanecem no repositório. |
