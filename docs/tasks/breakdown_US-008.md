# Task Breakdown: [US-008] Aceitar ou recusar solicitacao recebida

**Data:** 2026-10-23
**Participantes:** a definir (responsavel nao nomeado na Sprint 02)
**Estimativa total:** 5 pontos (~6 h)
**Nivel ScrumAIDev:** 1
**Spec governada:** N/A
**Contract governado:** N/A
**Padrao de erro:** N/A
**BDD associado:** `docs/bdd/contratacao.feature` (revisao manual — cenarios de BR06)
**Behavior change:** YES
**GitHub Epic Issue:** -
**GitHub Parent US Issue:** -
**GitHub Sprint Container:** - (publicacao no GitHub pendente de decisao da equipe)

---

## Pre-Flight de Governanca

- **US exige Spec governada?** Nao
- **US exige Contract governado?** Nao
- **Justificativa do Nivel ScrumAIDev:** a maquina de estados (BR06) ja esta no trigger `validar_contratacao` e o RLS limita as linhas as partes; o front so le, atualiza o status e assina o Realtime.
- **Justificativa:** sem API propria; nenhuma mudanca de banco (D7).
- **Touch List aplicavel:** `helpme-app/contratacoes.html` (novo), `helpme-app/js/contratacoes.js` (novo), `helpme-app/assets/css/contratacao.css`, `helpme-app/js/sessao.js` (`DESTINO_PROFISSIONAL_APROVADO`). O feed antigo ja sai no DEBT-006.
- **Runner BDD a executar:** N/A (revisao manual)
- **Validacao/teste de contrato e mock:** N/A

---

## Checagem de Principios (condicional)

Aplicavel (`Behavior change` = YES).

- [x] Abordagem mais simples: uma lista agrupada por status, botoes que fazem `update` condicionado a `status = 'solicitada'` e recarga da lista a cada evento do Realtime.
- [x] Sem dependencia nova; reaproveita os estilos `.card-pedido`/`.btn-aceitar`/`.badge-status` do `dashboard.css` (mantidos no DEBT-006 para isso).
- [x] Touch List respeitada.

**Complexidade Aceita:** nenhuma.

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] Pagina `contratacoes.html` (visao do profissional)
- **Estimativa:** 2 h
- **Criterio de conclusao:** `exigirSessao('profissional')`; lista as contratacoes recebidas agrupadas em "Aguardando sua resposta", "Aceitas" e "Encerradas", com descricao, endereco e data desejada (criterio 1); link "Editar meu perfil" (criterio 6).

#### [TASK-002] Aceitar / recusar
- **Estimativa:** 1,5 h
- **Dependencias:** TASK-001
- **Criterio de conclusao:** `update` com `.eq('status', 'solicitada')` e conferencia das linhas afetadas; 0 linhas = cliente cancelou antes → aviso "Esta solicitacao foi cancelada" e recarga (criterios 2 e 4).

#### [TASK-003] Realtime
- **Estimativa:** 1 h
- **Dependencias:** TASK-001
- **Criterio de conclusao:** nova solicitacao ou cancelamento aparece sem recarregar (criterio 3).

#### [TASK-004] Destino do profissional aprovado
- **Estimativa:** 0,25 h
- **Criterio de conclusao:** `DESTINO_PROFISSIONAL_APROVADO = 'contratacoes.html'` em `js/sessao.js`.

### Testing Tasks

#### [TASK-005] Testes
- **Estimativa:** 1,25 h
- **Criterio de conclusao:** harness com DOM/Supabase falsos (agrupamento, aceitar, recusar, cancelada antes, Realtime recarrega) + roteiro manual com duas abas no Supabase real (criterios 3 e 5).

---

## Ordem de Execucao Sugerida

TASK-004 → TASK-001 → TASK-002 → TASK-003 → TASK-005.

---

## Notas

- O link para os detalhes da contratacao aceita (`servico-andamento.html?id=`, D8) entra na US-009; ate la o card "Aceita" nao tem link.
- A visao do cliente nesta mesma pagina entra na US-009.
