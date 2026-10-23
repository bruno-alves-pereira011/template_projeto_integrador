// CONTRATAÇÕES (contratacoes.js) — US-008 / FR12 (visão do profissional)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// Fluxo:
//   1. exigirSessao('profissional').
//   2. Lê as contratações do próprio profissional (o RLS já filtra; o .eq é só para deixar claro)
//      e agrupa: aguardando resposta (solicitada), aceitas e encerradas (recusada/cancelada/concluida).
//   3. "Aceitar"/"Recusar" fazem update condicionado a status = 'solicitada'. Se nenhuma linha mudar,
//      o cliente cancelou antes (ou outra aba respondeu): mostra aviso e recarrega.
//   4. Realtime: qualquer mudança nas contratações do profissional recarrega a lista.
// SEGURANÇA: o trigger validar_contratacao (BR06) recusa qualquer outra transição, inclusive pelo console.

(function () {
    'use strict';

    // Texto do selo de status (a classe CSS é status-<status>, em contratacao.css)
    const ROTULO_STATUS = {
        solicitada: 'Aguardando resposta',
        aceita: 'Aceita',
        recusada: 'Recusada',
        cancelada: 'Cancelada pelo cliente',
        concluida: 'Concluída'
    };

    // Grupo da tela em que cada status aparece
    const GRUPO_DO_STATUS = {
        solicitada: 'grupo-solicitadas',
        aceita: 'grupo-aceitas',
        recusada: 'grupo-encerradas',
        cancelada: 'grupo-encerradas',
        concluida: 'grupo-encerradas'
    };

    const GRUPOS = ['grupo-solicitadas', 'grupo-aceitas', 'grupo-encerradas'];

    const el = (id) => document.getElementById(id);

    let uid = null;
    let consultaAtual = 0;       // descarta respostas antigas (Realtime + "Tentar novamente")
    let recargaAgendada = null;  // junta vários eventos do Realtime em uma recarga só

    // ==========================================
    // REGRAS PURAS (sem DOM/banco)
    // ==========================================

    // Separa as contratações por grupo, já na ordem de exibição:
    // aguardando e aceitas pela data desejada (a mais próxima primeiro); encerradas pela mais recente.
    function agrupar(contratacoes) {
        const grupos = { 'grupo-solicitadas': [], 'grupo-aceitas': [], 'grupo-encerradas': [] };

        contratacoes.forEach((c) => {
            const grupo = GRUPO_DO_STATUS[c.status];
            if (grupo) grupos[grupo].push(c);
        });

        const porDataDesejada = (a, b) => new Date(a.data_desejada) - new Date(b.data_desejada);
        grupos['grupo-solicitadas'].sort(porDataDesejada);
        grupos['grupo-aceitas'].sort(porDataDesejada);
        grupos['grupo-encerradas'].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        return grupos;
    }

    // "sex., 24/10 às 10:00"
    function textoData(iso) {
        const data = new Date(iso);
        if (Number.isNaN(data.getTime())) return 'Data não informada';
        const dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dia} às ${hora}`;
    }

    // Traduz erros do banco/rede. Detalhe técnico fica no console.
    function traduzirErroBanco(erro) {
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (texto.includes('somente profissional aprovado')) {
            return 'Seu cadastro não está aprovado no momento, então não é possível aceitar novas contratações.';
        }
        if (texto.includes('transição de status inválida') || texto.includes('transicao de status invalida')) {
            return 'Esta solicitação já foi respondida ou cancelada. A lista foi atualizada.';
        }
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
        }
        return 'Não foi possível concluir a ação agora. Tente novamente.';
    }

    // ==========================================
    // TELA
    // ==========================================

    function mostrarEstado(estado) {
        el('contratacoes-carregando').hidden = estado !== 'carregando';
        el('contratacoes-erro').hidden = estado !== 'erro';
        el('contratacoes-vazio').hidden = estado !== 'vazio';
        if (estado !== 'lista') GRUPOS.forEach((id) => { el(id).hidden = true; });
    }

    function mostrarAviso(texto) {
        const aviso = el('contratacoes-aviso');
        aviso.textContent = texto || '';
        aviso.hidden = !texto;
    }

    function montarCard(c) {
        const card = el('modelo-card-contratacao').content.cloneNode(true);

        card.querySelector('.card-numero').textContent = `Solicitação nº ${c.id}`;
        card.querySelector('.card-tempo').textContent = `Recebida em ${new Date(c.created_at).toLocaleDateString('pt-BR')}`;

        const selo = card.querySelector('.badge-status');
        selo.textContent = ROTULO_STATUS[c.status] || c.status;
        selo.classList.add('status-' + c.status);

        card.querySelector('.card-data').textContent = `Para: ${textoData(c.data_desejada)}`;
        card.querySelector('.card-descricao').textContent = c.descricao;
        card.querySelector('.texto-endereco').textContent = c.endereco;

        const acoes = card.querySelector('.acoes-card');
        if (c.status === 'solicitada') {
            const aceitar = document.createElement('button');
            aceitar.type = 'button';
            aceitar.className = 'btn-aceitar';
            aceitar.textContent = 'Aceitar';
            aceitar.setAttribute('aria-label', `Aceitar a solicitação nº ${c.id}`);
            aceitar.addEventListener('click', () => responder(c.id, 'aceita', [aceitar, recusar]));

            const recusar = document.createElement('button');
            recusar.type = 'button';
            recusar.className = 'btn-recusar';
            recusar.textContent = 'Recusar';
            recusar.setAttribute('aria-label', `Recusar a solicitação nº ${c.id}`);
            recusar.addEventListener('click', () => {
                if (window.confirm(`Recusar a solicitação nº ${c.id}? O cliente verá que ela foi recusada.`)) {
                    responder(c.id, 'recusada', [aceitar, recusar]);
                }
            });

            acoes.appendChild(aceitar);
            acoes.appendChild(recusar);
        }

        return card;
    }

    function renderizar(contratacoes) {
        if (!contratacoes.length) {
            mostrarEstado('vazio');
            return;
        }

        const grupos = agrupar(contratacoes);
        mostrarEstado('lista');

        GRUPOS.forEach((id) => {
            const secao = el(id);
            const grade = secao.querySelector('.grade-pedidos');
            const itens = grupos[id];

            grade.replaceChildren(...itens.map(montarCard));
            secao.querySelector('.contador-grupo').textContent = `(${itens.length})`;
            secao.hidden = itens.length === 0;
        });
    }

    // ==========================================
    // BANCO
    // ==========================================

    async function carregar() {
        const minhaConsulta = ++consultaAtual;

        try {
            const { data, error } = await supabaseClient
                .from('contratacoes')
                .select('id, descricao, endereco, data_desejada, status, created_at, updated_at')
                .eq('profissional_id', uid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (minhaConsulta !== consultaAtual) return;

            renderizar(data || []);
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar as contratações:', falha);
            mostrarEstado('erro');
        }
    }

    // Aceita ou recusa. O .eq('status', 'solicitada') faz o banco só mudar se ainda estiver solicitada.
    async function responder(id, novoStatus, botoes) {
        botoes.forEach((b) => { b.disabled = true; });
        mostrarAviso('');

        try {
            const { data, error } = await supabaseClient
                .from('contratacoes')
                .update({ status: novoStatus })
                .eq('id', id)
                .eq('status', 'solicitada')
                .select('id');

            if (error) throw error;

            if (!data || data.length === 0) {
                mostrarAviso('Esta solicitação foi cancelada pelo cliente (ou já foi respondida). A lista foi atualizada.');
            } else {
                mostrarAviso(novoStatus === 'aceita'
                    ? `Solicitação nº ${id} aceita. O contato do cliente agora está liberado.`
                    : `Solicitação nº ${id} recusada.`);
            }
        } catch (falha) {
            console.error('Erro ao responder a contratação:', falha);
            mostrarAviso(traduzirErroBanco(falha));
        }

        el('contratacoes-aviso').focus();
        await carregar();
    }

    // Realtime: o RLS faz o profissional receber só eventos das próprias contratações;
    // o filtro reduz o tráfego. Vários eventos seguidos viram uma recarga só.
    function assinarRealtime() {
        supabaseClient
            .channel('contratacoes-profissional-' + uid)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'contratacoes', filter: `profissional_id=eq.${uid}` },
                () => {
                    clearTimeout(recargaAgendada);
                    recargaAgendada = setTimeout(carregar, 300);
                })
            .subscribe();
    }

    // ==========================================
    // INÍCIO
    // ==========================================

    async function iniciar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('profissional');
            if (!sessao) return; // já redirecionou

            // Só profissional aprovado e com perfil completo usa esta tela (BR03); os outros vão
            // para onde o login os levaria (completar perfil ou bloqueio.html).
            const situacao = await buscarSituacaoProfissional(sessao.user.id);
            if (situacao.status !== 'aprovado' || !situacao.totalCategorias) {
                window.location.replace(calcularDestino({ tipo: 'profissional', ...situacao }, null));
                return;
            }

            uid = sessao.user.id;
        } catch (falha) {
            console.error('Erro ao verificar a sessão:', falha);
            mostrarEstado('erro');
            return;
        }

        el('link-perfil-publico').href = `profissional.html?id=${encodeURIComponent(uid)}`;

        await carregar();
        assinarRealtime();
    }

    el('btn-tentar-novamente').addEventListener('click', () => {
        if (!uid) { iniciar(); return; }
        mostrarEstado('carregando');
        carregar();
    });
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
