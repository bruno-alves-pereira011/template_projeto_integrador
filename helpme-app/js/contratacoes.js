// CONTRATAÇÕES (contratacoes.js) — US-008 / FR12 (profissional) e US-009 / FR11 (cliente)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao(). Profissional precisa estar aprovado e com perfil completo (BR03).
//   2. Lê as contratações de que a pessoa é parte (o RLS já filtra; o .eq deixa a intenção clara)
//      e agrupa: aguardando resposta (solicitada), aceitas e encerradas (recusada/cancelada/concluida).
//   3. Profissional: "Aceitar"/"Recusar" com update condicionado a status = 'solicitada'. Se nenhuma linha
//      mudar, o cliente cancelou antes (ou outra aba respondeu): aviso e recarga.
//      Cliente: cada card leva ao acompanhamento (espera-cliente.html ou servico-andamento.html — D8).
//   4. Realtime: qualquer mudança nas contratações da pessoa recarrega a lista.
// SEGURANÇA: o trigger validar_contratacao (BR06) recusa qualquer outra transição, inclusive pelo console.

(function () {
    'use strict';

    // Grupo da tela em que cada status aparece
    const GRUPO_DO_STATUS = {
        solicitada: 'grupo-solicitadas',
        aceita: 'grupo-aceitas',
        recusada: 'grupo-encerradas',
        cancelada: 'grupo-encerradas',
        concluida: 'grupo-encerradas'
    };

    const GRUPOS = ['grupo-solicitadas', 'grupo-aceitas', 'grupo-encerradas'];

    // Textos que mudam conforme quem está vendo
    const TEXTOS = {
        profissional: {
            titulo: 'Contratações recebidas',
            subtitulo: 'Novas solicitações aparecem aqui automaticamente.',
            vazio: 'Quando um cliente contratar você pelo seu perfil, a solicitação aparece aqui.',
            grupos: { 'grupo-solicitadas': 'Aguardando sua resposta', 'grupo-aceitas': 'Aceitas', 'grupo-encerradas': 'Encerradas' }
        },
        cliente: {
            titulo: 'Minhas contratações',
            subtitulo: 'O status se atualiza sozinho quando o profissional responder.',
            vazio: 'Você ainda não contratou ninguém. Escolha uma categoria na página inicial e contrate pelo perfil do profissional.',
            grupos: { 'grupo-solicitadas': 'Aguardando o profissional', 'grupo-aceitas': 'Aceitas', 'grupo-encerradas': 'Encerradas' }
        }
    };

    const el = (id) => document.getElementById(id);

    let uid = null;
    let papel = null;            // 'cliente' | 'profissional'
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

    // Traduz erros do banco/rede. Detalhe técnico fica no console.
    function traduzirErroBanco(erro) {
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (texto.includes('somente profissional aprovado')) {
            return 'Seu cadastro não está aprovado no momento, então não é possível aceitar novas contratações.';
        }
        if (texto.includes('transição de status inválida')) {
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

    // Textos e menu conforme o papel
    function configurarPapel() {
        const textos = TEXTOS[papel];
        document.title = `HelpMe - ${textos.titulo}`;
        el('titulo-pagina').textContent = textos.titulo;
        el('subtitulo-pagina').textContent = textos.subtitulo;
        el('texto-vazio').textContent = textos.vazio;
        GRUPOS.forEach((id) => { el(id).querySelector('.titulo-grupo').textContent = textos.grupos[id]; });

        el('menu-inicio').hidden = papel !== 'cliente';
        el('menu-editar-perfil').hidden = papel !== 'profissional';
        el('link-perfil-publico').hidden = papel !== 'profissional';
        if (papel === 'profissional') {
            el('link-perfil-publico').href = `profissional.html?id=${encodeURIComponent(uid)}`;
        }
    }

    function criarBotao(classe, texto, rotulo, aoClicar) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = classe;
        botao.textContent = texto;
        botao.setAttribute('aria-label', rotulo);
        botao.addEventListener('click', aoClicar);
        return botao;
    }

    function criarLink(texto, rotulo, href) {
        const link = document.createElement('a');
        link.className = 'link-card';
        link.textContent = texto;
        link.setAttribute('aria-label', rotulo);
        link.href = href;
        return link;
    }

    // nomes: { profissional_id: nome } (só na visão do cliente)
    function montarCard(c, nomes) {
        const card = el('modelo-card-contratacao').content.cloneNode(true);

        card.querySelector('.card-numero').textContent = `Solicitação nº ${c.id}`;
        card.querySelector('.card-tempo').textContent = papel === 'cliente'
            ? `Para ${nomes[c.profissional_id] || 'Profissional'}`
            : `Recebida em ${new Date(c.created_at).toLocaleDateString('pt-BR')}`;

        const selo = card.querySelector('.badge-status');
        selo.textContent = rotuloStatusContratacao(c.status, papel);
        selo.classList.add('status-' + c.status);

        card.querySelector('.card-data').textContent = `Para: ${textoDataContratacao(c.data_desejada)}`;
        card.querySelector('.card-descricao').textContent = c.descricao;
        card.querySelector('.texto-endereco').textContent = c.endereco;

        const acoes = card.querySelector('.acoes-card');

        if (papel === 'profissional' && c.status === 'solicitada') {
            const botoes = [];
            botoes.push(criarBotao('btn-aceitar', 'Aceitar', `Aceitar a solicitação nº ${c.id}`,
                () => responder(c.id, 'aceita', botoes)));
            botoes.push(criarBotao('btn-recusar', 'Recusar', `Recusar a solicitação nº ${c.id}`, () => {
                if (window.confirm(`Recusar a solicitação nº ${c.id}? O cliente verá que ela foi recusada.`)) {
                    responder(c.id, 'recusada', botoes);
                }
            }));
            botoes.forEach((b) => acoes.appendChild(b));
        } else if (papel === 'profissional' && (c.status === 'aceita' || c.status === 'concluida')) {
            acoes.appendChild(criarLink('Ver contato e detalhes', `Ver contato e detalhes da solicitação nº ${c.id}`, paginaDaContratacao(c)));
        } else if (papel === 'cliente') {
            acoes.appendChild(criarLink('Acompanhar', `Acompanhar a solicitação nº ${c.id}`, paginaDaContratacao(c)));
        }

        return card;
    }

    function renderizar(contratacoes, nomes) {
        if (!contratacoes.length) {
            mostrarEstado('vazio');
            return;
        }

        const grupos = agrupar(contratacoes);
        mostrarEstado('lista');

        GRUPOS.forEach((id) => {
            const secao = el(id);
            const itens = grupos[id];

            secao.querySelector('.grade-pedidos').replaceChildren(...itens.map((c) => montarCard(c, nomes)));
            secao.querySelector('.contador-grupo').textContent = `(${itens.length})`;
            secao.hidden = itens.length === 0;
        });
    }

    // ==========================================
    // BANCO
    // ==========================================

    // Nome de cada profissional (visão do cliente), pela view pública. Falha não impede a lista.
    async function buscarNomesProfissionais(contratacoes) {
        const ids = [...new Set(contratacoes.map((c) => c.profissional_id))];
        if (!ids.length) return {};

        try {
            const { data, error } = await supabaseClient
                .from('profissionais_publicos')
                .select('id, nome')
                .in('id', ids);
            if (error) throw error;

            const nomes = {};
            (data || []).forEach((p) => { nomes[p.id] = p.nome; });
            return nomes;
        } catch (falha) {
            console.error('Erro ao ler os nomes dos profissionais (a lista aparece sem eles):', falha);
            return {};
        }
    }

    async function carregar() {
        const minhaConsulta = ++consultaAtual;
        const coluna = papel === 'cliente' ? 'cliente_id' : 'profissional_id';

        try {
            const { data, error } = await supabaseClient
                .from('contratacoes')
                .select('id, profissional_id, descricao, endereco, data_desejada, status, created_at, updated_at')
                .eq(coluna, uid)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const contratacoes = data || [];
            const nomes = papel === 'cliente' ? await buscarNomesProfissionais(contratacoes) : {};
            if (minhaConsulta !== consultaAtual) return;

            renderizar(contratacoes, nomes);
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar as contratações:', falha);
            mostrarEstado('erro');
        }
    }

    // Profissional aceita ou recusa (só muda se ainda estiver 'solicitada').
    async function responder(id, novoStatus, botoes) {
        botoes.forEach((b) => { b.disabled = true; });
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(id, 'solicitada', novoStatus);

            if (!mudou) {
                mostrarAviso('Esta solicitação foi cancelada pelo cliente (ou já foi respondida). A lista foi atualizada.');
            } else {
                mostrarAviso(novoStatus === 'aceita'
                    ? `Solicitação nº ${id} aceita. O contato do cliente agora está liberado em "Ver contato e detalhes".`
                    : `Solicitação nº ${id} recusada.`);
            }
        } catch (falha) {
            console.error('Erro ao responder a contratação:', falha);
            mostrarAviso(traduzirErroBanco(falha));
        }

        el('contratacoes-aviso').focus();
        await carregar();
    }

    // Realtime: o RLS faz cada pessoa receber só eventos das próprias contratações;
    // o filtro reduz o tráfego. Vários eventos seguidos viram uma recarga só.
    function assinarRealtime() {
        const coluna = papel === 'cliente' ? 'cliente_id' : 'profissional_id';
        supabaseClient
            .channel(`contratacoes-${papel}-${uid}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'contratacoes', filter: `${coluna}=eq.${uid}` },
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
            const sessao = await exigirSessao();
            if (!sessao) return; // já redirecionou para o login

            if (sessao.usuario.tipo_usuario === 'profissional') {
                // Só profissional aprovado e com perfil completo usa esta tela (BR03); os outros vão
                // para onde o login os levaria (completar perfil ou bloqueio.html).
                const situacao = await buscarSituacaoProfissional(sessao.user.id);
                if (situacao.status !== 'aprovado' || !situacao.totalCategorias) {
                    window.location.replace(calcularDestino({ tipo: 'profissional', ...situacao }, null));
                    return;
                }
                papel = 'profissional';
            } else {
                papel = 'cliente';
            }

            uid = sessao.user.id;
        } catch (falha) {
            console.error('Erro ao verificar a sessão:', falha);
            mostrarEstado('erro');
            return;
        }

        configurarPapel();
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
