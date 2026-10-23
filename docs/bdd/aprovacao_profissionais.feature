# language: pt
# Spec: N/A — regras em docs/requirements/helpme-mvp-marco2.md (rev. 3)
# Fonte: FR15, FR17–FR21, BR11–BR19 (rev. 3); decisões D6 e D7 em docs/DECISOES.md
# Stories: US-014, US-015, US-013, US-016, US-021
# Banco: supabase/migrations/003_admin.sql e 004_triagem.sql (a criar)
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
    E a triagem registra o resultado "suspeito" por já ter sido recusado

  Cenário: Aprovado que edita o perfil com alerta sai do diretório
    Dado que "João Encanador" tem uma contratação "aceita"
    Quando ele edita a descrição incluindo "www.meusite.com"
    Então o status dele volta para "pendente"
    E ele não aparece mais no diretório
    Mas a contratação "aceita" ainda pode ser concluída
