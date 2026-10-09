# language: pt
# Spec: pendente — ainda não existe docs/specs/contratacao.yaml
# Fonte: docs/requirements/helpme-mvp-marco2.md (rev. 2) — FR10–FR14, BR06–BR10, NFR07
# Banco: template_projeto_integrador/supabase/migrations/001_schema.sql
# Execução: revisão manual (sem runner documentado em docs/context.md).
#           Os passos podem ser conferidos pelo app ou pelos blocos SQL de
#           template_projeto_integrador/supabase/README.md (seção "Testes manuais de RLS").

Funcionalidade: Contratação direta de profissional
  Como cliente do HelpMe
  Eu quero contratar um profissional aprovado direto pelo perfil dele e conversar com ele
  Para combinar o serviço residencial com data/horário e contato seguros

  Contexto:
    Dado que existe a cliente "Ana Paula Rocha" com telefone cadastrado
    E que existe o profissional aprovado "João Encanador"
    E que existe o profissional aprovado "Marcos Eletricista"
    E que existe a profissional pendente "Paula Pintora"

  # ---------------------------------------------------------------
  # BR10 — só cliente contrata, só profissional aprovado é contratado
  # ---------------------------------------------------------------

  Cenário: Cliente contrata profissional aprovado
    Dado que estou logado como "Ana Paula Rocha"
    Quando eu contrato "João Encanador" com descrição, endereço e data desejada para amanhã
    Então a contratação é criada com status "solicitada"
    E ela aparece na minha lista de contratações
    E ela aparece nas solicitações recebidas de "João Encanador"

  Cenário: Cliente não consegue contratar profissional pendente
    Dado que estou logado como "Ana Paula Rocha"
    Quando eu tento contratar "Paula Pintora"
    Então o sistema recusa a contratação
    E nenhuma contratação é criada

  Cenário: Profissional não consegue contratar
    Dado que estou logado como "João Encanador"
    Quando eu tento contratar "Marcos Eletricista"
    Então o botão "Contratar" não é exibido
    E se a requisição for enviada mesmo assim, o banco a recusa

  Cenário: Visitante sem login é levado ao login antes de contratar
    Dado que não estou logado
    E que estou no perfil de "João Encanador"
    Quando eu clico em "Contratar"
    Então sou levado para a tela de login
    E depois de entrar volto ao perfil de "João Encanador"

  Cenário: Cliente não cria contratação já aceita nem em nome de outra pessoa
    Dado que estou logado como "Ana Paula Rocha"
    Quando eu envio uma contratação com status "aceita" ou com outro cliente como contratante
    Então o banco recusa a contratação

  # ---------------------------------------------------------------
  # BR09 — data/horário desejado não pode estar no passado
  # ---------------------------------------------------------------

  Cenário: Data desejada no passado é recusada
    Dado que estou logado como "Ana Paula Rocha"
    Quando eu tento contratar "João Encanador" com data desejada de ontem
    Então o formulário avisa que a data não pode estar no passado
    E se a requisição for enviada mesmo assim, o banco a recusa

  # ---------------------------------------------------------------
  # BR06 — transições de status
  # ---------------------------------------------------------------

  Esquema do Cenário: Transições permitidas
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador" com status "<de>"
    Quando "<quem>" muda o status para "<para>"
    Então a contratação passa a ter status "<para>"
    E a outra parte vê o novo status sem recarregar a página

    Exemplos:
      | de         | quem              | para      |
      | solicitada | João Encanador    | aceita    |
      | solicitada | João Encanador    | recusada  |
      | solicitada | Ana Paula Rocha   | cancelada |
      | aceita     | Ana Paula Rocha   | concluida |
      | aceita     | João Encanador    | concluida |

  Esquema do Cenário: Transições proibidas
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador" com status "<de>"
    Quando "<quem>" tenta mudar o status para "<para>"
    Então o sistema recusa a mudança
    E a contratação continua com status "<de>"

    Exemplos:
      | de         | quem               | para      |
      | solicitada | Ana Paula Rocha    | aceita    |
      | solicitada | Ana Paula Rocha    | recusada  |
      | solicitada | João Encanador     | cancelada |
      | solicitada | João Encanador     | concluida |
      | solicitada | Marcos Eletricista | aceita    |
      | aceita     | Ana Paula Rocha    | cancelada |
      | aceita     | João Encanador     | recusada  |
      | recusada   | Ana Paula Rocha    | cancelada |
      | cancelada  | João Encanador     | aceita    |
      | concluida  | João Encanador     | aceita    |

  Cenário: Nenhum outro campo muda depois de criada
    Dado que existe uma contratação "solicitada" de "Ana Paula Rocha" para "João Encanador"
    Quando qualquer uma das partes tenta alterar descrição, endereço ou data desejada
    Então o sistema recusa a alteração

  Cenário: Cliente cancela enquanto o profissional aceita ao mesmo tempo
    Dado que existe uma contratação "solicitada" de "Ana Paula Rocha" para "João Encanador"
    Quando "Ana Paula Rocha" cancela a contratação
    E logo em seguida "João Encanador" tenta aceitá-la
    Então só o cancelamento vale
    E "João Encanador" vê um aviso de que a contratação não está mais disponível
    E a tela dele é recarregada

  Cenário: Profissional que perdeu a aprovação não aceita contratação
    Dado que existe uma contratação "solicitada" para "Marcos Eletricista"
    E que a equipe alterou o status de "Marcos Eletricista" para "recusado"
    Quando "Marcos Eletricista" tenta aceitar a contratação
    Então o sistema recusa o aceite
    Mas ele ainda pode recusar a contratação

  Cenário: Contratação nunca é apagada pelo app
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador"
    Quando qualquer uma das partes tenta apagá-la
    Então a contratação continua existindo

  # ---------------------------------------------------------------
  # BR07 — contato do cliente só após o aceite
  # ---------------------------------------------------------------

  Cenário: Profissional não vê o contato do cliente antes do aceite
    Dado que existe uma contratação "solicitada" de "Ana Paula Rocha" para "João Encanador"
    Quando "João Encanador" abre a contratação
    Então ele vê apenas o primeiro nome "Ana"
    E não vê o telefone da cliente

  Esquema do Cenário: Profissional vê o contato do cliente depois do aceite
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador" com status "<status>"
    Quando "João Encanador" abre a contratação
    Então ele vê o nome completo "Ana Paula Rocha" e o telefone da cliente

    Exemplos:
      | status    |
      | aceita    |
      | concluida |

  Cenário: Contato volta a ficar oculto em contratação recusada
    Dado que existe uma contratação "recusada" de "Ana Paula Rocha" para "João Encanador"
    Quando "João Encanador" abre a contratação
    Então ele vê apenas o primeiro nome "Ana"

  Cenário: Cliente sempre vê o contato do profissional contratado
    Dado que existe uma contratação "solicitada" de "Ana Paula Rocha" para "João Encanador"
    Quando "Ana Paula Rocha" abre a contratação
    Então ela vê nome, telefone e WhatsApp de "João Encanador"

  Cenário: Terceiro não vê a contratação nem o contato
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador"
    Quando "Marcos Eletricista" consulta contratações ou o contato dessa contratação
    Então ele não recebe nenhum dado

  # ---------------------------------------------------------------
  # BR08 + NFR07 — chat
  # ---------------------------------------------------------------

  Esquema do Cenário: Partes conversam enquanto a contratação está ativa
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador" com status "<status>"
    Quando "Ana Paula Rocha" envia a mensagem "Consegue vir de manhã?"
    Então "João Encanador" vê a mensagem sem recarregar a página
    E as mensagens aparecem em ordem cronológica

    Exemplos:
      | status     |
      | solicitada |
      | aceita     |

  Esquema do Cenário: Chat fica somente leitura depois que a contratação termina
    Dado que existe uma contratação de "Ana Paula Rocha" para "João Encanador" com status "<status>"
    E que ela tem mensagens anteriores
    Quando qualquer uma das partes tenta enviar uma mensagem
    Então o envio é recusado
    Mas o histórico de mensagens continua visível para as duas partes

    Exemplos:
      | status    |
      | recusada  |
      | cancelada |
      | concluida |

  Cenário: Terceiro não lê nem escreve no chat
    Dado que existe uma contratação "aceita" de "Ana Paula Rocha" para "João Encanador"
    Quando "Marcos Eletricista" tenta ler ou enviar mensagens nessa contratação
    Então ele não vê nenhuma mensagem
    E o envio é recusado

  Cenário: Ninguém envia mensagem em nome da outra parte
    Dado que existe uma contratação "aceita" de "Ana Paula Rocha" para "João Encanador"
    Quando "Ana Paula Rocha" tenta enviar uma mensagem com "João Encanador" como autor
    Então o envio é recusado

  Esquema do Cenário: Tamanho da mensagem
    Dado que existe uma contratação "aceita" de "Ana Paula Rocha" para "João Encanador"
    Quando "Ana Paula Rocha" tenta enviar uma mensagem com <conteudo>
    Então o envio é <resultado>

    Exemplos:
      | conteudo                    | resultado |
      | apenas espaços              | recusado  |
      | 1000 caracteres             | aceito    |
      | 1001 caracteres             | recusado  |

  Cenário: Mensagem com HTML é exibida como texto
    Dado que existe uma contratação "aceita" de "Ana Paula Rocha" para "João Encanador"
    Quando "Ana Paula Rocha" envia a mensagem "<b>oi</b>"
    Então "João Encanador" vê o texto literal "<b>oi</b>", sem formatação

  Cenário: Mensagem enviada não pode ser editada nem apagada
    Dado que "Ana Paula Rocha" enviou uma mensagem
    Quando ela tenta editar ou apagar essa mensagem
    Então a mensagem continua igual
