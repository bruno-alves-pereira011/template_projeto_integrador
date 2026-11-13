# Task Breakdown: [US-011] Esqueci minha senha

**Data:** 2026-11-13
**Participantes:** Bruno Alves (responsáveis na Sprint 03: Luiz Felipe Moro e Welcson)
**Estimativa total:** 3 pontos (~5 h)
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
- **Justificativa do Nivel ScrumAIDev:** fluxo padrão do Supabase Auth (`resetPasswordForEmail` + `updateUser`). Não há regra própria no banco nem tabela nova.
- **Justificativa:** não há API própria e o banco não muda.
- **Touch List aplicável:** `helpme-app/index.html`, `helpme-app/js/auth.js`, `helpme-app/assets/css/auth.css`, `helpme-app/redefinir-senha.html` (novo), `helpme-app/js/redefinir-senha.js` (novo).
- **Desvio da Touch List da story:** `auth.css` ganha 1 regra (posição do link "Esqueci minha senha"). O formulário de e-mail fica em `redefinir-senha.html`, e não dentro de `index.html`. A mesma tela atende o pedido do link, a troca da senha e o "pedir outro link" (critério 4).
- **Runner BDD / contrato / mock:** N/A (sem runner).

### Decisões de implementação

| Ponto | Decisão |
|---|---|
| Uma tela ou duas | `redefinir-senha.html` tem 3 modos: **pedir link** (aberta pelo login), **nova senha** (aberta pelo link do e-mail) e **link inválido** (erro no link, com o formulário para pedir outro). |
| Como reconhece o link | Lê `#type=recovery` ou `#error_code=...` da URL **antes** do supabase-js limpar o hash e espera `getSession()`. Se a página for recarregada no meio, uma marca em `sessionStorage` mantém o modo "nova senha". |
| BR22 | Resposta neutra para e-mail existente ou inexistente. A mesma mensagem neutra aparece para erros desconhecidos do envio (um erro de SMTP só acontece com e-mail cadastrado e revelaria a conta). Só formato de e-mail inválido, 429 e falta de rede têm mensagem própria. |
| Depois de salvar | `signOut()` (encerra também as outras sessões da conta) e volta para `index.html?senha=redefinida`, onde aparece a mensagem de sucesso. |
| Reuso | `auth.js` expõe `window.HelpMeAuth` (`traduzirErroAuth`, `definirCarregando`, `mostrarMensagem`, `mostrarErroCampo`, `emailValido`). `traduzirErroAuth` ganha o caso `same_password`. |

### Limitações conhecidas

- O 429 por e-mail ("aguarde 60 s") só acontece para conta existente. O critério 5 pede a mensagem, então isso fica aceito como risco baixo de enumeração.
- Só o fluxo implícito (padrão do supabase-js no navegador) é tratado. Se a equipe mudar o template de e-mail para `token_hash`, a tela precisa de `verifyOtp`.
- O texto do e-mail é o modelo padrão do Supabase (em inglês). Traduzir é configuração do painel, fora do código.

---

## Checagem de Principios (condicional)

Aplicável (`Behavior change` = YES).

- [x] Abordagem mais simples: uma tela nova e um link. Nenhuma dependência e nenhuma mudança no banco.
- [x] Sem dependência nova.
- [x] Touch List respeitada, com o desvio registrado acima.

**Complexidade Aceita:**

| Desvio | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Marca em `sessionStorage` para o modo "nova senha" | O supabase-js limpa o hash; recarregar a página mostraria "pedir link" com o usuário já logado pelo link | Sem a marca, quem recarrega precisaria pedir outro e-mail (e o plano gratuito limita o envio) |

---

## Tasks Tecnicas

### Frontend Tasks

#### [TASK-001] Link no login e mensagem de sucesso
- **Estimativa:** 0,5 h
- **Critério de conclusão:** `index.html` com o link "Esqueci minha senha" para `redefinir-senha.html` (critério 1); `?senha=redefinida` mostra "Senha alterada" no login (critério 3).

#### [TASK-002] Pedir o link por e-mail
- **Estimativa:** 1,5 h
- **Critério de conclusão:** mensagem neutra (critério 2), 429 com o texto de "muitas tentativas" (critério 5), `redirectTo` para `redefinir-senha.html` em http/https.

#### [TASK-003] Nova senha e link inválido
- **Estimativa:** 2 h
- **Critério de conclusão:** nova senha (6+) e confirmação, erros por campo (critério 3); link expirado/usado mostra mensagem e formulário para pedir outro (critério 4); 360px, toque de 44px, labels e foco visível (critérios 6 e 7).

#### [TASK-004] Configurar URL de retorno no Supabase (equipe)
- **Estimativa:** 0,25 h
- **Critério de conclusão:** URL de `redefinir-senha.html` (local e publicada) em Authentication → URL Configuration → Redirect URLs.

### Testing Tasks

#### [TASK-005] Testes
- **Estimativa:** 1 h
- **Critério de conclusão:** roteiro abaixo executado; resultado registrado na story.

---

## Roteiro de Testes (escrito antes da implementação)

| ID | Cenário | Esperado | Gate |
|---|---|---|---|
| RS-01 | Login → "Esqueci minha senha" | Abre `redefinir-senha.html` no modo "pedir link" | Review |
| RS-02 | E-mail com formato inválido | Erro no campo, nada é enviado | Review |
| RS-03 | E-mail cadastrado e e-mail inexistente | Mesma mensagem "Se este e-mail estiver cadastrado, enviamos um link" | Review |
| RS-04 | Pedir duas vezes seguidas para a mesma conta | Mensagem de "muitas tentativas" (429) | Done |
| RS-05 | Abrir o link do e-mail | Modo "nova senha" | Done |
| RS-06 | Senha com menos de 6 caracteres ou confirmação diferente | Erro no campo, sem chamada ao servidor | Review |
| RS-07 | Salvar nova senha | Volta ao login com "Senha alterada"; entrar com a nova senha funciona e a antiga não | Done |
| RS-08 | Abrir o mesmo link de novo depois de usado | Modo "link inválido" com formulário para pedir outro | Done |
| RS-09 | URL com `#error_code=otp_expired` | Modo "link inválido" | Review |
| RS-10 | 360px e navegação só por Tab | Sem rolagem horizontal; foco visível; botões de 44px | Review |
| RS-11 | Código | Sem `service_role`, sem dado fixo; textos por `textContent` | Review |

RS-04, RS-05, RS-07 e RS-08 dependem de e-mail real e da TASK-004. O SMTP padrão do Supabase envia poucos e-mails por hora, então os testes devem usar uma conta real e ser executados em sequência.

---

## Ordem de Execucao Sugerida

TASK-004 (pode ser feita em paralelo) → TASK-001 → TASK-002 → TASK-003 → TASK-005.
