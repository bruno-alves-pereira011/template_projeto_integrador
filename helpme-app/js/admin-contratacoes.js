// CONTRATAÇÕES PARA O ADMIN (admin-contratacoes.js) — US-020
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. exigirSessao('admin'). Lê ?profissional=<uuid>, ?status= e ?dias= para pré-filtrar.
//   2. rpc('contratacoes_admin') com status, período, nome e profissional; 50 por página ("Carregar mais").
//   3. Desenha a tabela (no celular cada linha vira um card). Nenhuma ação de escrita, nenhum link para o chat (BR21).
// SEGURANÇA: a função confere eh_admin() e devolve só nomes, status e datas.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);
    const POR_PAGINA = 50;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const STATUS = {
        solicitada: 'Aguardando resposta',
        aceita: 'Aceita',
        recusada: 'Recusada',
        cancelada: 'Cancelada',
        concluida: 'Concluída'
    };
    const PERIODOS = ['7', '30', '90', ''];

    let filtros = { status: '', dias: '30', busca: '', profissional: null };
    let carregados = 0;
    let total = 0;
    let buscando = false;

    function mostrarEstado(estado) {
        el('lista-carregando').hidden = estado !== 'carregando';
        el('lista-erro').hidden = estado !== 'erro';
        el('lista-vazia').hidden = estado !== 'vazia';
        el('tabela-caixa').hidden = estado !== 'conteudo';
    }

    function textoTotal() {
        const partes = [`${total} contrataç${total === 1 ? 'ão' : 'ões'}`];
        if (filtros.dias) partes.push(`criada${total === 1 ? '' : 's'} nos últimos ${filtros.dias} dias`);
        if (filtros.status) partes.push(`com status "${STATUS[filtros.status]}"`);
        if (filtros.busca) partes.push(`com "${filtros.busca}" no nome`);
        return partes.join(' ') + '. Consulta somente leitura.';
    }

    function celula(rotulo, conteudo) {
        const td = document.createElement('td');
        td.dataset.rotulo = rotulo;
        if (conteudo instanceof Node) td.append(conteudo);
        else td.textContent = conteudo;
        return td;
    }

    function criarLinha(c) {
        const tr = document.createElement('tr');

        const link = document.createElement('a');
        link.className = 'btn-link-admin';
        link.href = `admin-profissional.html?id=${encodeURIComponent(c.profissional_id)}`;
        link.textContent = c.profissional_nome || 'Sem nome';

        const selo = document.createElement('span');
        selo.className = 'selo-contratacao selo-contratacao-' + c.status;
        selo.textContent = STATUS[c.status] || c.status;

        tr.append(
            celula('Criada em', adm.formatarData(c.criada_em)),
            celula('Cliente', c.cliente_nome || 'Sem nome'),
            celula('Profissional', link),
            celula('Data desejada', adm.formatarData(c.data_desejada)),
            celula('Status', selo)
        );
        return tr;
    }

    function mostrarFiltroProfissional(nome) {
        el('filtro-profissional').hidden = !filtros.profissional;
        if (filtros.profissional) el('filtro-profissional-nome').textContent = nome || 'este profissional';
    }

    // novaBusca = true: recomeça do zero; false: "Carregar mais".
    async function buscar(novaBusca) {
        if (buscando) return;
        buscando = true;
        el('btn-buscar').disabled = true;
        el('btn-carregar-mais').disabled = true;

        if (novaBusca) {
            carregados = 0;
            el('corpo-contratacoes').replaceChildren();
            el('btn-carregar-mais').hidden = true;
            mostrarEstado('carregando');
        }

        try {
            const { data, error } = await supabaseClient.rpc('contratacoes_admin', {
                p_status: filtros.status || null,
                p_dias: filtros.dias ? Number(filtros.dias) : null,
                p_busca: filtros.busca || null,
                p_profissional_id: filtros.profissional,
                p_limite: POR_PAGINA,
                p_deslocamento: carregados
            });
            if (error) throw error;

            const linhas = data || [];
            total = linhas.length ? Number(linhas[0].total) : (novaBusca ? 0 : total);
            el('corpo-contratacoes').append(...linhas.map(criarLinha));
            carregados += linhas.length;
            if (novaBusca) mostrarFiltroProfissional(linhas.length ? linhas[0].profissional_nome : null);

            el('lista-total').textContent = textoTotal();
            el('btn-carregar-mais').hidden = carregados >= total;
            mostrarEstado(carregados === 0 ? 'vazia' : 'conteudo');
        } catch (falha) {
            console.error('Erro ao carregar as contratações:', falha);
            el('lista-erro-texto').textContent = falha && falha.code === 'PGRST202'
                ? 'A consulta de contratações ainda não foi instalada no banco (migration 008).'
                : adm.traduzirErro(falha);
            mostrarEstado('erro');
        } finally {
            buscando = false;
            el('btn-buscar').disabled = false;
            el('btn-carregar-mais').disabled = false;
        }
    }

    function lerFiltros() {
        filtros.status = el('filtro-status').value;
        filtros.dias = el('filtro-periodo').value;
        filtros.busca = el('filtro-busca').value.trim();
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

        const params = new URLSearchParams(window.location.search);
        const profissional = params.get('profissional');
        if (UUID.test(profissional || '')) {
            filtros.profissional = profissional;
            el('filtro-periodo').value = ''; // do detalhe do profissional: todo o histórico
        }
        if (STATUS[params.get('status')]) el('filtro-status').value = params.get('status');
        if (params.has('dias') && PERIODOS.includes(params.get('dias'))) el('filtro-periodo').value = params.get('dias');

        lerFiltros();
        buscar(true);
    }

    el('form-filtros').addEventListener('submit', (evento) => {
        evento.preventDefault();
        lerFiltros();
        buscar(true);
    });

    ['filtro-status', 'filtro-periodo'].forEach((id) => {
        el(id).addEventListener('change', () => {
            lerFiltros();
            buscar(true);
        });
    });

    el('btn-remover-profissional').addEventListener('click', () => {
        filtros.profissional = null;
        history.replaceState(null, '', 'admin-contratacoes.html');
        buscar(true);
        el('filtro-status').focus();
    });

    el('btn-limpar').addEventListener('click', () => {
        el('filtro-status').value = '';
        el('filtro-periodo').value = '';
        el('filtro-busca').value = '';
        filtros.profissional = null;
        history.replaceState(null, '', 'admin-contratacoes.html');
        lerFiltros();
        buscar(true);
        el('filtro-busca').focus();
    });

    el('btn-carregar-mais').addEventListener('click', () => buscar(false));
    el('btn-tentar-novamente').addEventListener('click', () => buscar(true));
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
