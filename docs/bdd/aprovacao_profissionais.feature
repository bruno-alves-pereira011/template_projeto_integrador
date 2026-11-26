# language: pt
# Spec: N/A — regras em docs/requirements/helpme-mvp-marco2.md (rev. 3)
# Fonte: FR15, FR17–FR21, FR25, BR11–BR19 (rev. 3); decisões D6 e D7 em docs/DECISOES.md
# Stories: US-014, US-015, US-013, US-016, US-021, US-019
# Banco: supabase/migrations/003_admin.sql, 004_fila_analise.sql, 005_triagem.sql e 007_suspensao.sql
# Execução: revisão manual (sem runner documentado em docs/context.md).
#           Os passos podem ser conferidos pelo app ou pelos roteiros de
#           supabase/testes/ (NFR11).

Funcionalidade: Aprovação de profissionais pela área administrativa
  Como administrador do HelpMe
  Eu quero receber os cadastros já triados e decidir em lote os casos simples
  Para liberar profissionais rápido sem aprovar quem não atende aos requisitos

  Contexto:
    Dado que existe o administrador "Equipe HelpMe"
    E que existe a cliente "Ana Paula Rocha"
    E que existe o profissional aprovado "João Encanador" com WhatsApp "(27) 99999-0001"

  # ---------------------------------------------------------------
  # BR11 — papel de administrador
  # ---------------------------------------------------------------

  Cenário: Administrador entra na área admin
    Dado que estou logado como "Equipe HelpMe"
    Então sou levado para a página do painel administrativo

  Cenário: Cliente não acessa a área admin
    Dado que estou logado como "Ana Paula Rocha"
    Quando eu abro a página do painel administrativo
    Então sou redirecionado para a página inicial do cliente

  Cenário: Cadastro pedindo papel de administrador vira cliente
    Quando alguém se cadastra informando o tipo "admin" nos metadados
    Então a conta é criada como cliente
    E ela não acessa a área admin

  Cenário: Profissional não aprova a si mesmo
    Dado que estou logado como o profissional pendente "Paula Pintora"
    Quando eu tento mudar meu status para "aprovado" pela API
    Então o sistema recusa a alteração
    E meu status continua "pendente"

  # ---------------------------------------------------------------
  # BR12, BR13 — triagem automática (classifica, não decide)
  # ---------------------------------------------------------------

  Cenário: Perfil completo é triado como verde
    Dado que o profissional "Carlos Chaveiro" completou o perfil com todos os dados válidos
    Quando ele salva o perfil
    Então a triagem registra o resultado "verde"
    E o status dele continua "pendente"

  Cenário: Perfil com pendência volta para o profissional
    Dado que o profissional "Pedro Pedreiro" salvou o perfil com descrição de 10 caracteres
    Então a triagem registra o resultado "pendencia" com o motivo "Descrição com menos de 30 caracteres"
    E ao entrar ele vê esse motivo na tela de cadastro em análise
    Quando ele corrige a descrição e salva de novo
    Então a triagem registra o resultado "verde"

  # ---------------------------------------------------------------
  # BR14 — sinais de suspeita
  # ---------------------------------------------------------------

  Cenário: WhatsApp repetido é suspeito
    Dado que o profissional "Gabriel Gesseiro" salvou o perfil com WhatsApp "(27) 99999-0001"
    Então a triagem registra o resultado "suspeito"
    E o detalhe do administrador mostra que o número é igual ao de "João Encanador"

  Cenário: Número de rua na descrição não é suspeito
    Dado que um profissional salvou a descrição "Atendo na Rua 12, casa 3, e bairros próximos"
    Então a triagem não aponta telefone embutido

  # ---------------------------------------------------------------
  # BR15, BR16, BR19 — decisão do administrador
  # ---------------------------------------------------------------

  Cenário: Aprovação em lote só dos verdes
    Dado que "Carlos Chaveiro" está verde e "Gabriel Gesseiro" está suspeito
    E que estou logado como "Equipe HelpMe"
    Quando eu seleciono os dois e clico em "Aprovar selecionados"
    Então "Carlos Chaveiro" fica "aprovado" e aparece no diretório
    E "Gabriel Gesseiro" é ignorado e listado como não aprovado
    E o histórico de "Carlos Chaveiro" registra "Equipe HelpMe" como autor

  Cenário: Recusa exige motivo
    Dado que estou logado como "Equipe HelpMe"
    Quando eu tento recusar "Gabriel Gesseiro" sem informar motivo
    Então a recusa não é enviada
    Quando eu recuso informando "WhatsApp já usado por outro cadastro"
    Então o status dele fica "recusado"
    E ao entrar ele vê esse motivo

  Cenário: Dois administradores decidem ao mesmo tempo
    Dado que dois administradores abriram o detalhe de "Carlos Chaveiro" pendente
    Quando um aprova e o outro recusa logo depois
    Então só a primeira decisão vale
    E o segundo administrador vê um aviso e a tela recarrega

  # ---------------------------------------------------------------
  # BR17, BR18 — reenvio e reanálise
  # ---------------------------------------------------------------

  Cenário: Profissional recusado reenvia para análise
    Dado que "Gabriel Gesseiro" foi recusado
    Quando ele corrige o perfil e clica em "Reenviar para análise"
    Então o status dele volta para "pendente"
    E o reenvio aparece no histórico do detalhe do administrador
    E ele continua na tela de cadastro em análise
    # US-021 (BR14): a partir dela, a triagem registra "suspeito" por já ter sido recusado.
    E a triagem registra o resultado "suspeito" por já ter sido recusado

  Cenário: Profissional recusado vê o motivo e as pendências
    Dado que "Gabriel Gesseiro" foi recusado com o motivo "WhatsApp já usado por outro cadastro"
    E a última triagem dele tem a pendência "Descrição com menos de 30 caracteres"
    Quando ele entra no app
    Então ele vê o motivo da recusa e essa pendência
    E vê o link "Corrigir meu perfil" e o botão "Reenviar para análise"
    Mas não vê nenhum sinal de suspeita da triagem

  Cenário: Só o recusado pode reenviar
    Dado que "Pedro Pedreiro" está "pendente"
    Quando ele tenta reenviar o cadastro pela API
    Então o reenvio é recusado e nada muda no histórico

  Cenário: Aprovado que edita o perfil com alerta sai do diretório
    Dado que "João Encanador" tem uma contratação "aceita"
    Quando ele edita a descrição incluindo "www.meusite.com"
    Então o status dele volta para "pendente"
    E ele não aparece mais no diretório
    Mas a contratação "aceita" ainda pode ser concluída

  # ---------------------------------------------------------------
  # FR25 — suspender e reativar profissional aprovado (US-019)
  # ---------------------------------------------------------------

  Cenário: Suspensão exige motivo
    Dado que "Carlos Chaveiro" está "aprovado"
    E que estou logado como "Equipe HelpMe"
    Quando eu tento suspender "Carlos Chaveiro" com o motivo "Atraso"
    Então a suspensão é recusada por motivo curto
    E "Carlos Chaveiro" continua "aprovado"

  Cenário: Suspenso sai do diretório e vê o motivo
    Dado que "Carlos Chaveiro" está "aprovado" e tem uma contratação "aceita" com "Ana Paula Rocha"
    Quando eu suspendo "Carlos Chaveiro" com o motivo "Reclamações repetidas de atraso"
    Então o status dele é "suspenso"
    E ele não aparece no diretório nem pode ser contratado
    E o histórico registra "Equipe HelpMe", a suspensão e o motivo
    E ao entrar ele vê "Seu cadastro está suspenso" com o motivo
    Mas "Ana Paula Rocha" ainda pode concluir a contratação "aceita"

  Cenário: Reativação devolve ao diretório
    Dado que "Carlos Chaveiro" está "suspenso"
    Quando eu reativo "Carlos Chaveiro"
    Então o status dele volta para "aprovado"
    E ele aparece de novo no diretório
    E o histórico registra a reativação

  Cenário: Só o primeiro admin suspende
    Dado que "Carlos Chaveiro" está "aprovado"
    E que outro administrador já suspendeu "Carlos Chaveiro"
    Quando eu tento suspendê-lo
    Então nada é alterado e eu vejo o aviso "Só profissional aprovado pode ser suspenso"
