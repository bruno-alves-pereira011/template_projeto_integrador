// LOGIN E CADASTRO (auth.js) — US-004
// Usado por index.html (login) e cadastro.html (cadastro). Cada parte só roda se o formulário existir.
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// O roteamento pós-login fica em destinoDoUsuario() (js/sessao.js), não aqui:
// assim login, cadastro e páginas protegidas usam a mesma regra.
// IMPORTANTE: o cadastro NÃO grava em nenhuma tabela. O trigger do banco cria 'usuarios'
// a partir de options.data, e o perfil profissional é criado em completar-perfil.html.

(function () {
    'use strict';

    // ==========================================
    // UTILITÁRIOS DE TELA
    // ==========================================

    // Mostra/esconde a mensagem geral do formulário (sempre via textContent: nada de HTML vindo de erro).
    function mostrarMensagem(elemento, texto, tipo) {
        if (!elemento) return;
        elemento.textContent = texto || '';
        elemento.className = 'mensagem mensagem-' + (tipo || 'erro');
        elemento.hidden = !texto;
    }

    // Erro junto ao campo: texto no <p id="erro-..."> (já ligado por aria-describedby) + aria-invalid.
    function mostrarErroCampo(campo, idErro, texto) {
        const erro = document.getElementById(idErro);
        if (erro) {
            erro.textContent = texto || '';
            erro.hidden = !texto;
        }
        if (campo) {
            if (texto) campo.setAttribute('aria-invalid', 'true');
            else campo.removeAttribute('aria-invalid');
        }
    }

    // Botão em "carregando": desabilita para evitar clique duplo e troca o texto.
    function definirCarregando(botao, carregando, textoCarregando) {
        if (!botao) return;
        if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.textContent.trim();
        botao.disabled = carregando;
        botao.textContent = carregando ? textoCarregando : botao.dataset.textoOriginal;
    }

    // Traduz os erros do Supabase Auth para mensagens claras.
    // Retorna { campo: 'email'|'senha'|null, texto }.
    function traduzirErroAuth(erro) {
        const codigo = (erro && erro.code) || '';
        const texto = ((erro && erro.message) || '').toLowerCase();
        const status = erro && erro.status;

        if (codigo === 'invalid_credentials' || texto.includes('invalid login credentials')) {
            return { campo: null, texto: 'E-mail ou senha incorretos. Confira os dados e tente de novo.' };
        }
        if (codigo === 'email_not_confirmed' || texto.includes('email not confirmed')) {
            return { campo: null, texto: 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos (veja também o spam) e depois entre.' };
        }
        if (codigo === 'user_already_exists' || codigo === 'email_exists' || texto.includes('already registered')) {
            return { campo: 'email', texto: 'Este e-mail já está cadastrado. Entre com ele ou use outro e-mail.' };
        }
        if (codigo === 'weak_password' || texto.includes('password should be') || texto.includes('weak password')) {
            return { campo: 'senha', texto: 'Senha fraca: use pelo menos 6 caracteres.' };
        }
        if (codigo === 'email_address_invalid' || texto.includes('invalid email') || texto.includes('unable to validate email')) {
            return { campo: 'email', texto: 'Digite um e-mail válido.' };
        }
        if (status === 429 || codigo.indexOf('rate_limit') !== -1) {
            return { campo: null, texto: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.' };
        }
        if ((erro && erro.name === 'AuthRetryableFetchError') || status === 0 || texto.includes('failed to fetch')) {
            return { campo: null, texto: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.' };
        }
        return { campo: null, texto: 'Não foi possível concluir agora. Tente novamente em instantes.' };
    }

    // E-mail com formato mínimo (a validação de verdade é do Supabase).
    function emailValido(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Telefone opcional: se preenchido, precisa ter de 10 a 13 dígitos (DDD + número, com ou sem 55).
    function telefoneValido(telefone) {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 10 && digitos.length <= 13;
    }

    // Repassa o ?voltar= (já validado) para o link entre login e cadastro, para não perder o retorno.
    function propagarVoltar(idLink) {
        const link = document.getElementById(idLink);
        const voltar = voltarSeguro(new URLSearchParams(window.location.search).get('voltar'));
        if (link && voltar) {
            link.href = link.getAttribute('href') + '?voltar=' + encodeURIComponent(voltar);
        }
    }

    // ==========================================
    // MOSTRAR/ESCONDER SENHA (as duas telas)
    // ==========================================
    const botaoMostrarSenha = document.getElementById('toggle-password');
    const campoSenha = document.getElementById('senha');

    if (botaoMostrarSenha && campoSenha) {
        botaoMostrarSenha.addEventListener('click', () => {
            const mostrar = campoSenha.type === 'password';
            campoSenha.type = mostrar ? 'text' : 'password';
            botaoMostrarSenha.textContent = mostrar ? 'Ocultar' : 'Mostrar';
            botaoMostrarSenha.setAttribute('aria-pressed', String(mostrar));
        });
    }

    // ==========================================
    // LOGIN (index.html)
    // ==========================================
    const formLogin = document.getElementById('login-form');

    if (formLogin) {
        const mensagemLogin = document.getElementById('login-mensagem');
        const botaoLogin = document.getElementById('btn-login');
        propagarVoltar('link-cadastro');

        // Leva o usuário logado para a tela certa (cliente, completar perfil, bloqueio ou aprovado).
        async function rotearUsuario(userId) {
            const destino = await destinoDoUsuario(userId);
            window.location.replace(destino);
        }

        // Veio do link de confirmação de e-mail: o supabase-js já abriu a sessão pela URL.
        if (new URLSearchParams(window.location.search).get('confirmado') === '1' && supabaseClient) {
            supabaseClient.auth.getSession().then(({ data }) => {
                if (data && data.session) {
                    mostrarMensagem(mensagemLogin, 'E-mail confirmado! Entrando...', 'sucesso');
                    return rotearUsuario(data.session.user.id);
                }
                mostrarMensagem(mensagemLogin, 'E-mail confirmado! Agora entre com seu e-mail e senha.', 'sucesso');
            }).catch((erro) => {
                console.error('Erro ao abrir a sessão confirmada:', erro);
            });
        }

        formLogin.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            mostrarMensagem(mensagemLogin, '');

            const email = document.getElementById('email').value.trim();
            // Senha NÃO leva trim: espaço pode fazer parte dela.
            const senha = campoSenha.value;

            if (!email || !senha) {
                mostrarMensagem(mensagemLogin, 'Preencha e-mail e senha.');
                return;
            }

            if (!supabaseClient) {
                mostrarMensagem(mensagemLogin, 'Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.');
                return;
            }

            definirCarregando(botaoLogin, true, 'Entrando...');

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: senha });

                if (error) {
                    console.error('Erro no login:', error);
                    mostrarMensagem(mensagemLogin, traduzirErroAuth(error).texto);
                    definirCarregando(botaoLogin, false);
                    return;
                }

                await rotearUsuario(data.user.id);
            } catch (erro) {
                // Login deu certo, mas a leitura do perfil falhou (rede/RLS).
                console.error('Erro ao decidir o destino após o login:', erro);
                mostrarMensagem(mensagemLogin, 'Você entrou, mas não conseguimos carregar seu perfil. Tente de novo em instantes.');
                definirCarregando(botaoLogin, false);
            }
        });
    }

    // ==========================================
    // CADASTRO (cadastro.html)
    // ==========================================
    const formCadastro = document.getElementById('form-cadastro');

    if (formCadastro) {
        const mensagemCadastro = document.getElementById('cadastro-mensagem');
        const botaoCadastro = document.getElementById('btn-cadastrar');
        const campoNome = document.getElementById('nome');
        const campoEmail = document.getElementById('email');
        const campoTelefone = document.getElementById('telefone');
        const grupoTipo = document.getElementById('grupo-tipo');
        propagarVoltar('link-login');

        // Valida tudo no front e marca cada campo com problema. Retorna o 1º campo inválido (para o foco) ou null.
        function validarCadastro(dados) {
            let primeiroInvalido = null;
            const marcar = (campo, idErro, texto) => {
                mostrarErroCampo(campo, idErro, texto);
                if (texto && !primeiroInvalido) primeiroInvalido = campo;
            };

            marcar(campoNome, 'erro-nome', dados.nome ? '' : 'Informe seu nome.');
            marcar(campoEmail, 'erro-email', emailValido(dados.email) ? '' : 'Digite um e-mail válido.');
            marcar(campoSenha, 'erro-senha', dados.senha.length >= 6 ? '' : 'Senha fraca: use pelo menos 6 caracteres.');
            marcar(campoTelefone, 'erro-telefone',
                !dados.telefone || telefoneValido(dados.telefone) ? '' : 'Telefone inválido: informe DDD + número.');

            const erroTipo = dados.tipo ? '' : 'Escolha se você quer contratar ou prestar serviços.';
            mostrarErroCampo(grupoTipo, 'erro-tipo', erroTipo);
            if (erroTipo && !primeiroInvalido) primeiroInvalido = grupoTipo.querySelector('input');

            return primeiroInvalido;
        }

        formCadastro.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            mostrarMensagem(mensagemCadastro, '');

            const tipoMarcado = formCadastro.querySelector('input[name="tipo_usuario"]:checked');
            const dados = {
                nome: campoNome.value.trim(),
                email: campoEmail.value.trim(),
                senha: campoSenha.value,
                telefone: campoTelefone.value.trim(),
                tipo: tipoMarcado ? tipoMarcado.value : ''
            };

            const invalido = validarCadastro(dados);
            if (invalido) {
                invalido.focus();
                return;
            }

            if (!supabaseClient) {
                mostrarMensagem(mensagemCadastro, 'Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.');
                return;
            }

            definirCarregando(botaoCadastro, true, 'Criando conta...');

            // Link do e-mail de confirmação volta para o login (só em http/https; em file:// o Supabase usa a Site URL).
            const opcoes = { data: { nome: dados.nome, tipo_usuario: dados.tipo, telefone: dados.telefone || null } };
            if (/^https?:$/.test(window.location.protocol)) {
                opcoes.emailRedirectTo = new URL('index.html?confirmado=1', window.location.href).href;
            }

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: dados.email,
                    password: dados.senha,
                    options: opcoes
                });

                if (error) {
                    console.error('Erro no cadastro:', error);
                    const traduzido = traduzirErroAuth(error);
                    if (traduzido.campo === 'email') {
                        mostrarErroCampo(campoEmail, 'erro-email', traduzido.texto);
                        campoEmail.focus();
                    } else if (traduzido.campo === 'senha') {
                        mostrarErroCampo(campoSenha, 'erro-senha', traduzido.texto);
                        campoSenha.focus();
                    } else {
                        mostrarMensagem(mensagemCadastro, traduzido.texto);
                    }
                    definirCarregando(botaoCadastro, false);
                    return;
                }

                // Com confirmação de e-mail ativa, o Supabase não revela se o e-mail já existe:
                // devolve um usuário "falso" sem identities. Tratamos como e-mail já cadastrado.
                if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                    mostrarErroCampo(campoEmail, 'erro-email', 'Este e-mail já está cadastrado. Entre com ele ou use outro e-mail.');
                    campoEmail.focus();
                    definirCarregando(botaoCadastro, false);
                    return;
                }

                // Sem sessão = confirmação de e-mail ativa. Não grava mais nada; só orienta.
                if (!data.session) {
                    const painel = document.getElementById('cadastro-confirmar');
                    document.getElementById('cadastro-confirmar-texto').textContent =
                        'Enviamos um link para ' + dados.email + '. Abra o e-mail (veja também o spam), confirme e depois entre.';
                    formCadastro.hidden = true;
                    painel.hidden = false;
                    painel.focus();
                    return;
                }

                // Com sessão: cliente vai para a home (ou para onde estava); profissional completa o perfil.
                if (dados.tipo === 'profissional') {
                    window.location.replace(PAGINA_COMPLETAR_PERFIL);
                } else {
                    const voltar = voltarSeguro(new URLSearchParams(window.location.search).get('voltar'));
                    window.location.replace(voltar || PAGINA_INICIAL_CLIENTE);
                }
            } catch (erro) {
                console.error('Erro inesperado no cadastro:', erro);
                mostrarMensagem(mensagemCadastro, traduzirErroAuth(erro).texto);
                definirCarregando(botaoCadastro, false);
            }
        });
    }
})();
