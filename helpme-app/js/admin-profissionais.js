// LISTA DE PROFISSIONAIS PARA O ADMIN (admin-profissionais.js) — US-019
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. exigirSessao('admin'). ?status= pré-seleciona o filtro (links do painel).
//   2. rpc('profissionais_admin') com status, parte do nome, 50 por página. "Carregar mais" pede a próxima.
//   3. Cada card leva ao detalhe com ?de=profissionais (o "Voltar" de lá volta para esta lista).
// SEGURANÇA: a função confere eh_admin() e devolve só as colunas da lista.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);
    const POR_PAGINA = 50;
    const STATUS_VALIDOS = ['aprovado', 'pendente', 'suspenso', 'recusado'];

    let filtros = { status: '', busca: '' };
    let carregados = 0;
    let total = 0;
    let buscando = false;

    function mostrarEstado(estado) {
        el('lista-carregando').hidden = estado !== 'carregando';
        el('lista-erro').hidden = estado !== 'erro';
        el('lista-vazia').hidden = estado !== 'vazia';
    }

    function textoTotal() {
        const rotulo = filtros.status ? adm.rotuloStatus(filtros.status).toLowerCase() : '';
        const base = `${total} profissiona${total === 1 ? 'l' : 'is'}`;
        const partes = [base + (rotulo ? ` com status ${rotulo}` : '')];
        if (filtros.busca) partes.push(`com "${filtros.busca}" no nome`);
        return partes.join(' ') + '.';
    }

    function criarCard(p) {
        const card = el('modelo-card-profissional').content.firstElementChild.cloneNode(true);
        card.querySelector('.card-prof-nome').textContent = p.nome || 'Sem nome';

        const status = card.querySelector('.card-prof-status');
        status.textContent = adm.rotuloStatus(p.status);
        status.classList.add('status-admin-' + p.status);

        const local = [p.bairro, p.cidade].filter(Boolean).join(', ');
        card.querySelector('.card-fila-local').textContent = local || 'Local não informado';
        card.querySelector('.card-fila-categorias').textContent =
            (p.categorias && p.categorias.length) ? p.categorias.join(', ') : 'Sem categoria';
        card.querySelector('.card-prof-desde').textContent = `Cadastrado em ${adm.formatarData(p.cadastrado_em)}`;

        const link = card.querySelector('.card-prof-detalhe');
        link.href = `admin-profissional.html?id=${encodeURIComponent(p.id)}&de=profissionais`;
        link.setAttribute('aria-label', `Ver detalhes de ${p.nome || 'profissional'}`);
        return card;
    }

    // novaBusca = true: recomeça do zero; false: "Carregar mais".
    async function buscar(novaBusca) {
        if (buscando) return;
        buscando = true;
        el('btn-buscar').disabled = true;
        el('btn-carregar-mais').disabled = true;

        if (novaBusca) {
            carregados = 0;
            el('lista-profissionais').replaceChildren();
            el('btn-carregar-mais').hidden = true;
            mostrarEstado('carregando');
        }

        try {
            const { data, error } = await supabaseClient.rpc('profissionais_admin', {
                p_status: filtros.status || null,
                p_busca: filtros.busca || null,
                p_limite: POR_PAGINA,
                p_deslocamento: carregados
            });
            if (error) throw error;

            const linhas = data || [];
            total = linhas.length ? Number(linhas[0].total) : (novaBusca ? 0 : total);
            el('lista-profissionais').append(...linhas.map(criarCard));
            carregados += linhas.length;

            el('lista-total').textContent = textoTotal();
            el('btn-carregar-mais').hidden = carregados >= total;
            mostrarEstado(carregados === 0 ? 'vazia' : 'conteudo');
        } catch (falha) {
            console.error('Erro ao carregar os profissionais:', falha);
            el('lista-erro-texto').textContent = falha && falha.code === 'PGRST202'
                ? 'A lista de profissionais ainda não foi instalada no banco (migration 007).'
                : adm.traduzirErro(falha);
            mostrarEstado('erro');
        } finally {
            buscando = false;
            el('btn-buscar').disabled = false;
            el('btn-carregar-mais').disabled = false;
        }
    }

    function lerFiltros() {
        filtros = { status: el('filtro-status').value, busca: el('filtro-busca').value.trim() };
    }

    async function iniciar() {
        mostrarEstado('carregando');
        try {
            const sessao = await exigirSessao('admin');
            if (!sessao) return; // já redirecionou
        } catch (falha) {
            console.error('Erro ao verificar o acesso:', falha);
            el('lista-erro-texto').textContent = adm.traduzirErro(falha);
            mostrarEstado('erro');
            return;
        }

        const statusUrl = new URLSearchParams(window.location.search).get('status');
        if (STATUS_VALIDOS.includes(statusUrl)) el('filtro-status').value = statusUrl;
        lerFiltros();
        buscar(true);
    }

    el('form-filtros').addEventListener('submit', (evento) => {
        evento.preventDefault();
        lerFiltros();
        buscar(true);
    });

    el('filtro-status').addEventListener('change', () => {
        lerFiltros();
        buscar(true);
    });

    el('btn-limpar').addEventListener('click', () => {
        el('filtro-status').value = '';
        el('filtro-busca').value = '';
        lerFiltros();
        buscar(true);
        el('filtro-busca').focus();
    });

    el('btn-carregar-mais').addEventListener('click', () => buscar(false));
    el('btn-tentar-novamente').addEventListener('click', () => buscar(true));
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
