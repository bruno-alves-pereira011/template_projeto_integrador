// CHAT DA CONTRATAÇÃO (chat.js) — US-010 / FR14, BR08, NFR07 (decisão D9)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao() + ?id=. Não é parte (ou não existe): "não encontrada".
//   2. Assina o Realtime de mensagens ANTES de ler o histórico: ao conectar, relê o histórico, e o que
//      chegar pelos dois caminhos é ignorado pelo id. Assim nenhuma mensagem cai no intervalo.
//   3. Envio só em 'solicitada'/'aceita' (BR08). Se o status mudar, o campo acompanha.
//   4. Ao voltar para a aba, relê tudo: no celular o WebSocket cai em segundo plano.
// SEGURANÇA: o banco decide quem lê e quem escreve (RLS de `mensagens`) e o tamanho (check). As
// validações daqui são só para responder rápido. O conteúdo vai sempre por textContent, nunca como HTML.

(function () {
    'use strict';

    const LIMITE_CARACTERES = 1000; // mesmo limite do check de mensagens.conteudo (NFR07)
    const COLUNAS_MENSAGEM = 'id, contratacao_id, autor_id, conteudo, created_at';
    const STATUS_COM_ENVIO = ['solicitada', 'aceita'];
    const FOLGA_ROLAGEM = 60; // px: "perto do fim" para seguir as mensagens novas

    const TEXTO_ENCERRADO = {
        recusada: 'Esta contratação foi recusada. O histórico continua disponível, mas não é possível enviar mensagens.',
        cancelada: 'Esta contratação foi cancelada. O histórico continua disponível, mas não é possível enviar mensagens.',
        concluida: 'Esta contratação foi concluída. O histórico continua disponível, mas não é possível enviar mensagens.'
    };

    const el = (id) => document.getElementById(id);

    const idContratacao = lerIdContratacaoDaUrl();
    const lista = el('chat-lista');
    const campo = el('chat-texto');
    const idsExibidos = new Set();

    let uid = null;
    let contratacao = null;
    let nomeOutraParte = '';
    let enviando = false;
    let consultaAtual = 0;   // carga da tela (carregar)
    let atualizacaoAtual = 0; // atualização em segundo plano: contador próprio para não cancelar a carga
    let assinada = false;

    function mostrarEstado(estado) {
        el('chat-carregando').hidden = estado !== 'carregando';
        el('chat-erro').hidden = estado !== 'erro';
        el('chat-nao-encontrada').hidden = estado !== 'nao-encontrada';
        el('chat-detalhe').hidden = estado !== 'detalhe';
    }

    function mostrarAviso(texto) {
        el('chat-aviso').textContent = texto || '';
        el('chat-aviso').hidden = !texto;
    }

    function podeEnviar() {
        return Boolean(contratacao) && STATUS_COM_ENVIO.includes(contratacao.status);
    }

    // Conta como o banco (char_length): um emoji vale 1, não 2 como em String.length.
    function tamanhoDoTexto() {
        return Array.from(campo.value.trim()).length;
    }

    function atualizarFormulario() {
        const tamanho = tamanhoDoTexto();
        const excedeu = tamanho > LIMITE_CARACTERES;

        const contador = el('chat-contador');
        contador.textContent = excedeu
            ? `${tamanho}/${LIMITE_CARACTERES} — mensagem muito longa`
            : `${tamanho}/${LIMITE_CARACTERES}`;
        contador.classList.toggle('chat-contador-excedido', excedeu);

        if (excedeu) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');

        campo.disabled = !podeEnviar();
        el('btn-enviar').disabled = enviando || !podeEnviar() || tamanho === 0 || excedeu;
    }

    function textoHorario(iso) {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    }

    function criarItem(m) {
        const minha = m.autor_id === uid;
        const item = el('modelo-mensagem').content.firstElementChild.cloneNode(true);

        item.dataset.tempo = String(new Date(m.created_at).getTime());
        item.dataset.id = String(m.id);
        item.classList.toggle('chat-msg-minha', minha);
        item.querySelector('.chat-msg-autor').textContent = minha ? 'Você' : nomeOutraParte;
        item.querySelector('.chat-msg-texto').textContent = m.conteudo;

        const hora = item.querySelector('.chat-msg-hora');
        hora.dateTime = m.created_at;
        hora.textContent = textoHorario(m.created_at);

        return item;
    }

    function vemDepois(item, novo) {
        const diferenca = Number(item.dataset.tempo) - Number(novo.dataset.tempo);
        return diferenca > 0 || (diferenca === 0 && Number(item.dataset.id) > Number(novo.dataset.id));
    }

    function rolarParaOFim() {
        lista.scrollTop = lista.scrollHeight;
    }

    // Insere na posição cronológica, sem refazer a lista (o leitor de tela anuncia só a mensagem nova).
    // Quem está lendo mensagens antigas não é puxado para baixo, a não ser pela própria mensagem.
    function adicionarMensagem(m) {
        const chave = String(m.id);
        if (idsExibidos.has(chave)) return;
        idsExibidos.add(chave);

        const estavaNoFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < FOLGA_ROLAGEM;
        const novo = criarItem(m);
        const seguinte = Array.from(lista.children).find((item) => vemDepois(item, novo));
        lista.insertBefore(novo, seguinte || null);

        el('chat-vazio').hidden = true;
        if (estavaNoFim || m.autor_id === uid) rolarParaOFim();
    }

    async function lerMensagens() {
        const { data, error } = await supabaseClient
            .from('mensagens')
            .select(COLUNAS_MENSAGEM)
            .eq('contratacao_id', idContratacao)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;

        (data || []).forEach(adicionarMensagem);
        el('chat-vazio').hidden = idsExibidos.size > 0;
    }

    function aplicarContratacao(c, papel) {
        contratacao = c;

        const selo = el('detalhe-status');
        selo.textContent = rotuloStatusContratacao(c.status, papel);
        selo.className = 'badge-status status-' + c.status;

        const encerrado = TEXTO_ENCERRADO[c.status] || '';
        el('chat-encerrado').textContent = encerrado;
        el('chat-encerrado').hidden = !encerrado;

        // O profissional só tem tela de detalhe depois do aceite; antes, volta para a lista.
        const temDetalhe = papel === 'cliente' || c.status === 'aceita' || c.status === 'concluida';
        el('link-voltar').href = temDetalhe ? paginaDaContratacao(c) : PAGINA_CONTRATACOES;

        atualizarFormulario();
    }

    function papelNa(c) {
        return c.cliente_id === uid ? 'cliente' : 'profissional';
    }

    // Atualização em segundo plano: se falhar, a conversa na tela continua e só o console registra.
    async function atualizar() {
        const minhaAtualizacao = ++atualizacaoAtual;

        try {
            const c = await buscarContratacao(idContratacao);
            if (c && minhaAtualizacao === atualizacaoAtual) aplicarContratacao(c, papelNa(c));
            await lerMensagens();
        } catch (falha) {
            console.error('Erro ao atualizar a conversa:', falha);
        }
    }

    function assinarMensagens() {
        supabaseClient
            .channel('mensagens-' + idContratacao)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `contratacao_id=eq.${idContratacao}` },
                (evento) => { if (evento && evento.new) adicionarMensagem(evento.new); })
            .subscribe((estado) => {
                if (estado === 'SUBSCRIBED') {
                    el('chat-conexao').hidden = true;
                    atualizar();
                } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
                    console.error('Realtime do chat indisponível:', estado);
                    el('chat-conexao').hidden = false;
                }
            });
    }

    async function carregar() {
        const minhaConsulta = ++consultaAtual;
        mostrarEstado('carregando');

        try {
            const c = await buscarContratacao(idContratacao);
            if (minhaConsulta !== consultaAtual) return;

            if (!c) {
                mostrarEstado('nao-encontrada');
                return;
            }

            const papel = papelNa(c);
            nomeOutraParte = papel === 'cliente' ? 'Profissional' : 'Cliente';

            // Nome da outra parte. Se falhar, a conversa continua com o rótulo genérico.
            try {
                const contato = await buscarContatoContraparte(c.id);
                if (contato && contato.nome) nomeOutraParte = contato.nome;
            } catch (falha) {
                console.error('Erro ao ler o nome da outra parte:', falha);
            }
            if (minhaConsulta !== consultaAtual) return;

            el('detalhe-outra-parte').textContent = nomeOutraParte;
            aplicarContratacao(c, papel);

            if (!assinada) {
                assinada = true;
                assinarMensagens();
                assinarContratacao(c.id, () => atualizar());
            }

            await lerMensagens();
            if (minhaConsulta !== consultaAtual) return;

            mostrarEstado('detalhe');
            rolarParaOFim();
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar a conversa:', falha);
            mostrarEstado('erro');
        }
    }

    function textoDaFalha(falha) {
        const texto = ((falha && falha.message) || '').toLowerCase();
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return 'Sem conexão com o servidor. Sua mensagem não foi enviada; tente de novo.';
        }
        if (falha && falha.code === '42501') {
            return 'Esta conversa foi encerrada e sua mensagem não foi enviada.'; // RLS: status mudou (BR08)
        }
        return 'Não foi possível enviar a mensagem. Tente novamente.';
    }

    async function enviar(evento) {
        evento.preventDefault();

        const tamanho = tamanhoDoTexto();
        if (enviando || !podeEnviar() || tamanho === 0 || tamanho > LIMITE_CARACTERES) return;

        enviando = true;
        atualizarFormulario();
        mostrarAviso('');

        try {
            const { data, error } = await supabaseClient
                .from('mensagens')
                .insert({ contratacao_id: Number(idContratacao), autor_id: uid, conteudo: campo.value.trim() })
                .select(COLUNAS_MENSAGEM)
                .single();

            if (error) throw error;

            adicionarMensagem(data);
            campo.value = '';
        } catch (falha) {
            console.error('Erro ao enviar a mensagem:', falha);
            mostrarAviso(textoDaFalha(falha));
            if (falha && falha.code === '42501') await atualizar();
        }

        enviando = false;
        atualizarFormulario();
        if (podeEnviar()) campo.focus();
    }

    // No teclado físico, Enter envia e Shift+Enter quebra a linha. No toque, Enter quebra a linha.
    function aoTeclar(evento) {
        if (evento.key !== 'Enter' || evento.shiftKey || evento.isComposing) return;
        if (window.matchMedia('(pointer: coarse)').matches) return;

        evento.preventDefault();
        el('chat-form').requestSubmit();
    }

    async function iniciar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao();
            if (!sessao) return; // já redirecionou para o login
            uid = sessao.user.id;
        } catch (falha) {
            console.error('Erro ao verificar a sessão:', falha);
            mostrarEstado('erro');
            return;
        }

        if (!idContratacao) {
            mostrarEstado('nao-encontrada');
            return;
        }

        await carregar();
    }

    el('chat-form').addEventListener('submit', enviar);
    campo.addEventListener('input', atualizarFormulario);
    campo.addEventListener('keydown', aoTeclar);
    el('btn-tentar-novamente').addEventListener('click', () => (uid ? carregar() : iniciar()));
    el('btn-sair').addEventListener('click', sair);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && contratacao) atualizar();
    });

    iniciar();
})();
