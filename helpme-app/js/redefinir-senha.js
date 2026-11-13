// REDEFINIR SENHA (redefinir-senha.js) — US-011
// OBJETIVO: pedir o link de redefinição por e-mail e, quando o link é aberto, gravar a nova senha.
// COMO O SUPABASE FUNCIONA AQUI (fluxo implícito, padrão do supabase-js no navegador):
//   1. resetPasswordForEmail(email, { redirectTo }) manda o e-mail (só se a conta existir; a resposta é igual).
//   2. O link do e-mail passa pelo Supabase e volta para esta página com #access_token=...&type=recovery.
//      O supabase-js abre uma sessão de recuperação sozinho e limpa o #hash.
//      Link expirado ou já usado volta com #error_code=otp_expired (ou outro error_code).
//   3. updateUser({ password }) grava a nova senha usando essa sessão.
// DEPENDE DE: supabase-config.js (supabaseClient) e auth.js (window.HelpMeAuth). O endereço original do
// link é guardado em window.HELPME_URL_INICIAL por um script inline no topo da página.

(function () {
    'use strict';

    const auth = window.HelpMeAuth;

    // Marca que esta aba está no meio de uma redefinição: se a página for recarregada, o #hash já foi
    // limpo, mas a sessão de recuperação continua; sem a marca a tela voltaria para "pedir link".
    const CHAVE_RECUPERACAO = 'helpme-redefinindo-senha';

    // Resposta única, exista ou não a conta (BR22: não revelar quem tem cadastro).
    const TEXTO_LINK_ENVIADO = 'Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha. ' +
        'Veja também a caixa de spam. O link vale por pouco tempo e só pode ser usado uma vez.';

    const MODOS = {
        pedir: {
            titulo: 'Esqueci minha senha',
            subtitulo: 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.'
        },
        nova: {
            titulo: 'Crie uma nova senha',
            subtitulo: 'Escolha a nova senha da sua conta. Depois é só entrar com ela.'
        },
        invalido: {
            titulo: 'Link inválido ou expirado',
            subtitulo: 'Peça um novo link abaixo. Ele chega no mesmo e-mail.'
        }
    };

    const el = (id) => document.getElementById(id);

    const mensagem = el('redefinir-mensagem');
    const formPedir = el('form-pedir-link');
    const formNova = el('form-nova-senha');
    const campoEmail = el('email');
    const campoNova = el('nova-senha');
    const campoConfirmar = el('confirmar-senha');
    const botaoPedir = el('btn-pedir-link');
    const botaoSalvar = el('btn-salvar-senha');


    // ==========================================
    // MODOS DA TELA
    // ==========================================

    // Troca título, subtítulo e formulário visível. `focar` = leva o foco ao título (anuncia a mudança).
    function mostrarModo(modo, focar) {
        const textos = MODOS[modo];
        el('redefinir-titulo').textContent = textos.titulo;
        el('redefinir-subtitulo').textContent = textos.subtitulo;
        document.title = 'HelpMe - ' + textos.titulo;

        formPedir.hidden = modo === 'nova';
        formNova.hidden = modo !== 'nova';

        if (focar) el('redefinir-titulo').focus();
    }

    function mostrarLinkInvalido(texto) {
        sessionStorage.removeItem(CHAVE_RECUPERACAO);
        mostrarModo('invalido', true);
        auth.mostrarMensagem(mensagem, texto ||
            'Este link de redefinição expirou ou já foi usado. Peça um novo link para continuar.', 'erro');
    }

    // Lê o endereço do link (guardado antes do supabase-js limpar o #hash).
    function lerLinkRecebido() {
        const inicial = window.HELPME_URL_INICIAL || { hash: window.location.hash, search: window.location.search };
        const hash = new URLSearchParams((inicial.hash || '').replace(/^#/, ''));
        const query = new URLSearchParams(inicial.search || '');

        return {
            erro: hash.get('error_code') || hash.get('error') || query.get('error_code') || query.get('error'),
            recuperacao: hash.get('type') === 'recovery'
        };
    }

    // Decide o modo inicial. getSession() espera o supabase-js terminar de ler o link.
    async function iniciar() {
        const link = lerLinkRecebido();
        const temMarca = sessionStorage.getItem(CHAVE_RECUPERACAO) === '1';

        if (!supabaseClient) {
            mostrarModo('pedir');
            auth.mostrarMensagem(mensagem, 'Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.');
            return;
        }

        if (link.erro) {
            console.error('Link de redefinição recusado pelo Supabase:', link.erro);
            limparEnderecoDoLink();
            mostrarLinkInvalido();
            return;
        }

        if (!link.recuperacao && !temMarca) {
            mostrarModo('pedir');
            return;
        }

        // Veio do link (ou recarregou no meio): confere se a sessão de recuperação abriu.
        const verificando = el('redefinir-verificando');
        verificando.hidden = false;
        formPedir.hidden = true;

        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;

            limparEnderecoDoLink();

            if (data && data.session) {
                sessionStorage.setItem(CHAVE_RECUPERACAO, '1');
                mostrarModo('nova');
                campoNova.focus();
            } else {
                mostrarLinkInvalido();
            }
        } catch (erro) {
            console.error('Erro ao abrir a sessão de recuperação:', erro);
            mostrarLinkInvalido('Não foi possível validar o link. Verifique sua internet ou peça um novo link.');
        } finally {
            verificando.hidden = true;
        }
    }

    // Tira tokens/erros da barra de endereço e do histórico (o supabase-js já limpa o sucesso; o erro, não).
    function limparEnderecoDoLink() {
        if (window.location.hash || window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }


    // ==========================================
    // PEDIR O LINK
    // ==========================================
    formPedir.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        auth.mostrarMensagem(mensagem, '');

        const email = campoEmail.value.trim();

        if (!auth.emailValido(email)) {
            auth.mostrarErroCampo(campoEmail, 'erro-email', 'Digite um e-mail válido.');
            campoEmail.focus();
            return;
        }
        auth.mostrarErroCampo(campoEmail, 'erro-email', '');

        if (!supabaseClient) {
            auth.mostrarMensagem(mensagem, 'Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.');
            return;
        }

        // O link volta para esta página (só em http/https; em file:// o Supabase usa a Site URL do painel).
        // A URL precisa estar em Authentication -> URL Configuration -> Redirect URLs (TASK-004).
        const opcoes = {};
        if (/^https?:$/.test(window.location.protocol)) {
            opcoes.redirectTo = new URL('redefinir-senha.html', window.location.href).href;
        }

        auth.definirCarregando(botaoPedir, true, 'Enviando...');

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, opcoes);

            if (error) {
                console.error('Erro ao pedir o link de redefinição:', error);
                const traduzido = auth.traduzirErroAuth(error);
                const codigo = error.code || '';
                // Limite de envio (429, critério 5) e falta de rede podem ser mostrados sem revelar nada.
                // Falta de rede = status 0. (O supabase-js também chama um 5xx de AuthRetryableFetchError,
                // por isso o nome do erro não basta.)
                const motivoConhecido = error.status === 429 || codigo.indexOf('rate_limit') !== -1 || !error.status;

                if (traduzido.campo === 'email') {
                    auth.mostrarErroCampo(campoEmail, 'erro-email', traduzido.texto);
                    campoEmail.focus();
                } else if (motivoConhecido) {
                    auth.mostrarMensagem(mensagem, traduzido.texto);
                } else {
                    // Outro erro (ex.: falha no envio do e-mail) só acontece com conta existente:
                    // mostrar a causa revelaria o cadastro (BR22). O detalhe fica no console.
                    auth.mostrarMensagem(mensagem, TEXTO_LINK_ENVIADO, 'sucesso');
                }
                return;
            }

            auth.mostrarMensagem(mensagem, TEXTO_LINK_ENVIADO, 'sucesso');
        } catch (erro) {
            console.error('Erro inesperado ao pedir o link de redefinição:', erro);
            auth.mostrarMensagem(mensagem, auth.traduzirErroAuth(erro).texto);
        } finally {
            auth.definirCarregando(botaoPedir, false);
        }
    });


    // ==========================================
    // GRAVAR A NOVA SENHA
    // ==========================================

    // Erros que indicam sessão de recuperação ausente/expirada: o link precisa ser pedido de novo.
    function sessaoDeRecuperacaoPerdida(erro) {
        const codigo = (erro && erro.code) || '';
        return (erro && erro.name === 'AuthSessionMissingError') ||
            erro.status === 401 || erro.status === 403 ||
            ['session_not_found', 'session_expired', 'bad_jwt', 'user_not_found'].indexOf(codigo) !== -1;
    }

    formNova.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        auth.mostrarMensagem(mensagem, '');

        // Senha NÃO leva trim: espaço pode fazer parte dela.
        const senha = campoNova.value;
        const confirmacao = campoConfirmar.value;

        const erroSenha = senha.length >= 6 ? '' : 'Senha fraca: use pelo menos 6 caracteres.';
        const erroConfirmacao = erroSenha || senha === confirmacao ? '' : 'As senhas não conferem. Digite a mesma senha nos dois campos.';
        auth.mostrarErroCampo(campoNova, 'erro-nova-senha', erroSenha);
        auth.mostrarErroCampo(campoConfirmar, 'erro-confirmar-senha', erroConfirmacao);

        if (erroSenha) { campoNova.focus(); return; }
        if (erroConfirmacao) { campoConfirmar.focus(); return; }

        auth.definirCarregando(botaoSalvar, true, 'Salvando...');

        try {
            const { error } = await supabaseClient.auth.updateUser({ password: senha });

            if (error) {
                console.error('Erro ao gravar a nova senha:', error);
                if (sessaoDeRecuperacaoPerdida(error)) {
                    mostrarLinkInvalido('Seu link de redefinição expirou. Peça um novo link para continuar.');
                    return;
                }
                const traduzido = auth.traduzirErroAuth(error);
                if (traduzido.campo === 'senha') {
                    auth.mostrarErroCampo(campoNova, 'erro-nova-senha', traduzido.texto);
                    campoNova.focus();
                } else {
                    auth.mostrarMensagem(mensagem, traduzido.texto);
                }
                return;
            }

            // Senha trocada: encerra a sessão de recuperação (e as outras sessões da conta) e volta ao login.
            sessionStorage.removeItem(CHAVE_RECUPERACAO);
            try {
                await supabaseClient.auth.signOut();
            } catch (erroSair) {
                console.error('Senha alterada, mas o signOut falhou:', erroSair);
            }
            window.location.replace('index.html?senha=redefinida');
        } catch (erro) {
            console.error('Erro inesperado ao gravar a nova senha:', erro);
            auth.mostrarMensagem(mensagem, auth.traduzirErroAuth(erro).texto);
        } finally {
            auth.definirCarregando(botaoSalvar, false);
        }
    });


    // ==========================================
    // MOSTRAR/ESCONDER SENHA (um botão por campo)
    // ==========================================
    document.querySelectorAll('.btn-mostrar-senha[data-alvo]').forEach((botao) => {
        botao.addEventListener('click', () => {
            const campo = el(botao.dataset.alvo);
            const mostrar = campo.type === 'password';
            campo.type = mostrar ? 'text' : 'password';
            botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
            botao.setAttribute('aria-pressed', String(mostrar));
        });
    });


    iniciar();
})();
