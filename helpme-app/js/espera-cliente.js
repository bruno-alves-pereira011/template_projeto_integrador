// ESPERA DO CLIENTE (espera-cliente.js) — US-009 / FR11 (decisão D8)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao() + ?id= da contratação. Não é parte dela (ou não existe): "não encontrada".
//   2. Profissional não fica aqui (vai para a lista ou para o serviço em andamento).
//      Aceita/concluída: vai para servico-andamento.html.
//   3. 'solicitada': mostra "aguardando" e o botão Cancelar. 'recusada'/'cancelada': mostra o desfecho.
//   4. Realtime da contratação: qualquer mudança recarrega (e o aceite leva ao serviço em andamento).

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    const idContratacao = lerIdContratacaoDaUrl();
    let uid = null;
    let consultaAtual = 0;
    let assinada = false;

    const TEXTO_SITUACAO = {
        solicitada: 'Aguardando o profissional aceitar ou recusar. Você pode cancelar enquanto ele não responde.',
        recusada: 'O profissional recusou esta solicitação. Você pode procurar outro profissional da mesma categoria.',
        cancelada: 'Você cancelou esta solicitação.'
    };

    function mostrarEstado(estado) {
        el('espera-carregando').hidden = estado !== 'carregando';
        el('espera-erro').hidden = estado !== 'erro';
        el('espera-nao-encontrada').hidden = estado !== 'nao-encontrada';
        el('espera-detalhe').hidden = estado !== 'detalhe';
    }

    function mostrarAviso(texto) {
        el('espera-aviso').textContent = texto || '';
        el('espera-aviso').hidden = !texto;
    }

    function preencher(c, nomeProfissional) {
        el('detalhe-profissional').textContent = nomeProfissional;
        const selo = el('detalhe-status');
        selo.textContent = rotuloStatusContratacao(c.status, 'cliente');
        selo.className = 'badge-status status-' + c.status;
        el('detalhe-data').textContent = textoDataContratacao(c.data_desejada);
        el('detalhe-descricao').textContent = c.descricao;
        el('detalhe-endereco').textContent = c.endereco;
        el('espera-situacao').textContent = TEXTO_SITUACAO[c.status] || '';

        el('btn-cancelar').hidden = c.status !== 'solicitada';
        el('btn-cancelar').disabled = false;
        el('link-buscar-outro').hidden = c.status === 'solicitada';
    }

    async function carregar() {
        const minhaConsulta = ++consultaAtual;

        try {
            const c = await buscarContratacao(idContratacao);
            if (minhaConsulta !== consultaAtual) return;

            if (!c) {
                mostrarEstado('nao-encontrada');
                return;
            }

            // Profissional responde pela lista; esta tela é do cliente.
            if (c.profissional_id === uid) {
                window.location.replace(c.status === 'aceita' || c.status === 'concluida'
                    ? paginaDaContratacao(c)
                    : PAGINA_CONTRATACOES);
                return;
            }

            // Aceita ou concluída: a tela certa é a do serviço em andamento.
            if (c.status === 'aceita' || c.status === 'concluida') {
                window.location.replace(paginaDaContratacao(c));
                return;
            }

            // Nome do profissional (público). Se falhar, a tela continua sem ele.
            let nome = 'Profissional';
            try {
                const contato = await buscarContatoContraparte(c.id);
                if (contato && contato.nome) nome = contato.nome;
            } catch (falha) {
                console.error('Erro ao ler o nome do profissional:', falha);
            }
            if (minhaConsulta !== consultaAtual) return;

            preencher(c, nome);
            mostrarEstado('detalhe');

            if (!assinada) {
                assinada = true;
                assinarContratacao(c.id, () => carregar());
            }
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar a contratação:', falha);
            mostrarEstado('erro');
        }
    }

    async function cancelar() {
        if (!window.confirm('Cancelar esta solicitação? O profissional verá que ela foi cancelada.')) return;

        el('btn-cancelar').disabled = true;
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(idContratacao, 'solicitada', 'cancelada');
            mostrarAviso(mudou
                ? 'Solicitação cancelada.'
                : 'O profissional respondeu antes do cancelamento. A tela foi atualizada.');
        } catch (falha) {
            console.error('Erro ao cancelar:', falha);
            const texto = ((falha && falha.message) || '').toLowerCase();
            mostrarAviso(texto.includes('failed to fetch') || texto.includes('network')
                ? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
                : 'Não foi possível cancelar agora. Tente novamente.');
        }

        el('espera-aviso').focus();
        await carregar();
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

    el('btn-cancelar').addEventListener('click', cancelar);
    el('btn-tentar-novamente').addEventListener('click', () => (uid ? carregar() : iniciar()));
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
