// SERVIÇO EM ANDAMENTO (servico-andamento.js) — US-009 / FR13 (decisão D8)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/telefone.js
//                           -> js/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao() + ?id=. Não é parte (ou não existe): "não encontrada".
//   2. Só 'aceita' e 'concluida' ficam aqui; os outros status vão para a tela certa.
//   3. Contato da outra parte pela função contato_contraparte (BR07) -> botões Ligar/WhatsApp.
//   4. 'aceita': qualquer parte conclui (update condicionado a status = 'aceita'). Depois, sem ações.
//   5. Realtime: se a outra parte concluir, a tela atualiza sozinha.

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    const idContratacao = lerIdContratacaoDaUrl();
    let uid = null;
    let consultaAtual = 0;
    let assinada = false;

    function mostrarEstado(estado) {
        el('servico-carregando').hidden = estado !== 'carregando';
        el('servico-erro').hidden = estado !== 'erro';
        el('servico-nao-encontrada').hidden = estado !== 'nao-encontrada';
        el('servico-detalhe').hidden = estado !== 'detalhe';
    }

    function mostrarAviso(texto) {
        el('servico-aviso').textContent = texto || '';
        el('servico-aviso').hidden = !texto;
    }

    // Botões de contato. O cliente não tem WhatsApp próprio no modelo: para ele, o telefone serve
    // para os dois botões (mesma regra comentada em contato_contraparte, 001_schema.sql).
    function preencherContato(contato, papel) {
        const nome = (contato && contato.nome) || (papel === 'cliente' ? 'Profissional' : 'Cliente');
        const telefone = contato && contato.telefone;
        const whatsapp = contato && (contato.whatsapp || (papel === 'profissional' ? contato.telefone : null));

        const hrefTel = linkTel(telefone);
        const hrefWhatsApp = linkWhatsApp(whatsapp);

        const ligar = el('btn-ligar');
        const zap = el('btn-whatsapp');

        if (hrefTel) {
            ligar.href = hrefTel;
            ligar.setAttribute('aria-label', `Ligar para ${nome}`);
        } else {
            ligar.removeAttribute('href');
        }
        ligar.hidden = !hrefTel;

        if (hrefWhatsApp) {
            zap.href = hrefWhatsApp;
            zap.setAttribute('aria-label', `Conversar com ${nome} no WhatsApp (abre em nova aba)`);
        } else {
            zap.removeAttribute('href');
        }
        zap.hidden = !hrefWhatsApp;

        const indisponivel = el('contato-indisponivel');
        indisponivel.hidden = Boolean(hrefTel || hrefWhatsApp);
        indisponivel.textContent = papel === 'cliente'
            ? 'O profissional não cadastrou um telefone válido.'
            : 'O cliente não cadastrou telefone.';

        return nome;
    }

    function preencher(c, papel, contato) {
        el('rotulo-outra-parte').textContent = papel === 'cliente' ? 'Profissional' : 'Cliente';
        el('detalhe-outra-parte').textContent = preencherContato(contato, papel);

        const selo = el('detalhe-status');
        selo.textContent = rotuloStatusContratacao(c.status, papel);
        selo.className = 'badge-status status-' + c.status;

        el('detalhe-data').textContent = textoDataContratacao(c.data_desejada);
        el('detalhe-descricao').textContent = c.descricao;
        el('detalhe-endereco').textContent = c.endereco;

        el('servico-situacao').textContent = c.status === 'concluida'
            ? `Serviço concluído em ${new Date(c.updated_at).toLocaleDateString('pt-BR')}.`
            : 'Contratação aceita. Combine os detalhes e marque como concluído quando o serviço terminar.';

        el('btn-concluir').hidden = c.status !== 'aceita';
        el('btn-concluir').disabled = false;
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

            const papel = c.cliente_id === uid ? 'cliente' : 'profissional';

            // Antes do aceite (ou recusada/cancelada) a tela certa é outra.
            if (c.status !== 'aceita' && c.status !== 'concluida') {
                window.location.replace(papel === 'cliente' ? paginaDaContratacao(c) : PAGINA_CONTRATACOES);
                return;
            }

            const contato = await buscarContatoContraparte(c.id);
            if (minhaConsulta !== consultaAtual) return;

            preencher(c, papel, contato);
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

    async function concluir() {
        if (!window.confirm('Marcar este serviço como concluído? Depois disso não dá para desfazer.')) return;

        el('btn-concluir').disabled = true;
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(idContratacao, 'aceita', 'concluida');
            mostrarAviso(mudou ? 'Serviço marcado como concluído.' : 'A outra parte já tinha concluído este serviço.');
        } catch (falha) {
            console.error('Erro ao concluir:', falha);
            const texto = ((falha && falha.message) || '').toLowerCase();
            mostrarAviso(texto.includes('failed to fetch') || texto.includes('network')
                ? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
                : 'Não foi possível concluir agora. Tente novamente.');
        }

        el('servico-aviso').focus();
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

    el('btn-concluir').addEventListener('click', concluir);
    el('btn-tentar-novamente').addEventListener('click', () => (uid ? carregar() : iniciar()));
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
