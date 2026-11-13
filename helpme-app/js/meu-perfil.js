// MEU PERFIL DO CLIENTE (meu-perfil.js) — US-012
// OBJETIVO: o cliente vê e edita nome e telefone da própria linha em 'usuarios'.
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/telefone.js.
// Fluxo:
//   1. exigirSessao('cliente'): visitante vai ao login com ?voltar=meu-perfil.html; profissional vai para a tela dele.
//   2. Preenche o formulário com a linha de 'usuarios' que o exigirSessao já leu.
//   3. Valida no front (nome obrigatório; telefone opcional com DDD) e grava só nome e telefone.
//      O RLS só deixa alterar a própria linha e o trigger proteger_usuario barra tipo_usuario.

(function () {
    'use strict';

    const el = {
        carregando: document.getElementById('perfil-carregando'),
        erroCarga: document.getElementById('perfil-erro-carga'),
        btnRecarregar: document.getElementById('btn-recarregar'),
        form: document.getElementById('form-perfil'),
        mensagem: document.getElementById('perfil-mensagem'),
        email: document.getElementById('perfil-email'),
        nome: document.getElementById('nome'),
        telefone: document.getElementById('telefone'),
        btnSalvar: document.getElementById('btn-salvar'),
        btnSair: document.getElementById('btn-sair')
    };

    let uid = null;
    let salvando = false;


    // ==========================================
    // UTILITÁRIOS DE TELA
    // ==========================================

    function mostrarEstado(estado) {
        el.carregando.hidden = estado !== 'carregando';
        el.erroCarga.hidden = estado !== 'erro';
        el.form.hidden = estado !== 'formulario';
    }

    // Sempre por textContent: nada de HTML vindo do banco ou de erro.
    function mostrarMensagem(texto, tipo) {
        el.mensagem.textContent = texto || '';
        el.mensagem.className = 'mensagem mensagem-' + (tipo || 'erro');
        el.mensagem.hidden = !texto;
    }

    function mostrarErroCampo(campo, idErro, texto) {
        const erro = document.getElementById(idErro);
        erro.textContent = texto || '';
        erro.hidden = !texto;
        if (texto) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');
    }

    function definirSalvando(ativo) {
        salvando = ativo;
        el.btnSalvar.disabled = ativo;
        el.btnSalvar.textContent = ativo ? 'Salvando...' : 'Salvar';
    }

    // Erros do banco/rede -> texto claro. Detalhe técnico só no console.
    function traduzirErroBanco(erro) {
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
        }
        if (erro && (erro.code === '42501' || erro.code === 'PGRST301' || texto.includes('jwt'))) {
            return 'Sua sessão expirou. Entre de novo para salvar.';
        }
        return 'Não foi possível salvar agora. Tente novamente em instantes.';
    }


    // ==========================================
    // CARREGAR
    // ==========================================
    async function carregar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('cliente');
            if (!sessao) return; // já redirecionou

            uid = sessao.user.id;
            el.email.textContent = sessao.user.email || '';
            el.nome.value = sessao.usuario.nome || '';
            el.telefone.value = sessao.usuario.telefone || '';

            mostrarEstado('formulario');
            el.nome.focus();
        } catch (falha) {
            console.error('Erro ao carregar o perfil do cliente:', falha);
            mostrarEstado('erro');
        }
    }


    // ==========================================
    // SALVAR
    // ==========================================
    async function salvar(evento) {
        evento.preventDefault();
        if (salvando) return;
        mostrarMensagem('');

        const nome = el.nome.value.trim();
        const telefone = el.telefone.value.trim();

        const erroNome = nome ? '' : 'Informe seu nome.';
        const erroTelefone = !telefone || telefoneValido(telefone) ? '' : 'Telefone inválido: informe DDD + número.';
        mostrarErroCampo(el.nome, 'erro-nome', erroNome);
        mostrarErroCampo(el.telefone, 'erro-telefone', erroTelefone);

        if (erroNome) { el.nome.focus(); return; }
        if (erroTelefone) { el.telefone.focus(); return; }

        definirSalvando(true);

        try {
            // .select() devolve a linha alterada: se o RLS bloquear, vem vazio (sem erro) e não mostramos sucesso falso.
            const { data, error } = await supabaseClient
                .from('usuarios')
                .update({ nome: nome, telefone: telefone || null })
                .eq('id', uid)
                .select('nome, telefone')
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error('Nenhuma linha alterada (sessão expirada ou sem permissão).');

            el.nome.value = data.nome || '';
            el.telefone.value = data.telefone || '';
            mostrarMensagem('Dados salvos!', 'sucesso');
            el.mensagem.focus();

            // A saudação da home lê o nome do login (user_metadata). Sincroniza por melhor esforço:
            // o dado oficial já está em 'usuarios', então uma falha aqui só vai para o console.
            supabaseClient.auth.updateUser({ data: { nome: data.nome } }).then(({ error: erroMeta }) => {
                if (erroMeta) console.error('Perfil salvo, mas o nome do login não foi atualizado:', erroMeta);
            }).catch((erroMeta) => {
                console.error('Perfil salvo, mas o nome do login não foi atualizado:', erroMeta);
            });
        } catch (falha) {
            console.error('Erro ao salvar o perfil do cliente:', falha);
            const texto = falha && falha.message && falha.message.indexOf('Nenhuma linha alterada') === 0
                ? 'Sua sessão expirou. Entre de novo para salvar.'
                : traduzirErroBanco(falha);
            mostrarMensagem(texto);
            el.mensagem.focus();
        } finally {
            definirSalvando(false);
        }
    }


    el.form.addEventListener('submit', salvar);
    el.btnRecarregar.addEventListener('click', carregar);
    el.btnSair.addEventListener('click', sair);

    carregar();
})();
