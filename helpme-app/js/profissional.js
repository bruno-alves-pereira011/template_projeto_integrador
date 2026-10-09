// LÓGICA DO PROFISSIONAL (profissional.js)
// OBJETIVO: Gerenciar o feed e o aceite de chamados.
// O QUE FAZER AQUI:
// - Função para buscar pedidos na tabela 'pedidos' onde status == 'aberto'.
// - Lógica do botão "Aceitar Serviço": atualiza o pedido para status = 'em_andamento' e preenche profissional_id com o ID do usuário logado.


// Cor e sigla de cada categoria, indexadas pelo slug. Vêm da tabela 'categorias'
// (js/categorias.js) em vez de uma lista fixa, para o feed usar os mesmos dados da home.
let categoriasPorSlug = {};

let usuarioLogado = null;   // { id, categoria }

// O modo demonstração e os pedidos fictícios saíram daqui: o modo agora é definido só em
// js/supabase-config.js (false) e o feed sempre usa dados reais.

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // PROTEÇÃO DA PÁGINA
    // Só profissional aprovado pode ver o feed
    // ==========================================
    const { data: sessao } = await supabaseClient.auth.getSession();

    if (!sessao.session) {
        window.location.href = 'index.html';
        return;
    }

    const uid = sessao.session.user.id;

    const { data: perfil, error: perfilError } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', uid)
        .single();

    if (perfilError || perfil.tipo_usuario !== 'profissional') {
        window.location.href = 'index.html';
        return;
    }

    if (perfil.status_aprovacao !== 'aprovado') {
        window.location.href = 'bloqueio.html';
        return;
    }

    // Se a tabela 'usuarios' tiver a coluna 'categoria', o feed filtra por ela
    usuarioLogado = { id: uid, categoria: perfil.categoria || null };

    // ==========================================
    // FEED DE OPORTUNIDADES
    // ==========================================
    if (document.getElementById('lista-pedidos')) {
        // Se as categorias falharem, o feed continua: os cards só ficam com a cor/sigla padrão
        try {
            categoriasPorSlug = mapaCategoriasPorSlug(await carregarCategorias());
        } catch (falha) {
            console.error('Erro ao carregar categorias:', falha);
        }

        await carregarPedidos();

        document.getElementById('btn-atualizar').addEventListener('click', carregarPedidos);

        // Tempo real: recarrega o feed quando um pedido é criado ou alterado
        supabaseClient
            .channel('feed-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarPedidos)
            .subscribe();
    }

    // ==========================================
    // BOTÃO SAIR
    // ==========================================
    const btnSair = document.getElementById('btn-sair');

    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});


// Busca os pedidos abertos e desenha os cards
async function carregarPedidos() {
    const contador = document.getElementById('contador-pedidos');

    let consulta = supabaseClient
        .from('pedidos')
        .select('*')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false });

    if (usuarioLogado.categoria) {
        consulta = consulta.eq('categoria', usuarioLogado.categoria);
    }

    const { data: pedidos, error } = await consulta;

    if (error) {
        console.error(error);
        contador.textContent = 'Não foi possível carregar os pedidos.';
        return;
    }

    renderizarPedidos(pedidos);
}


function renderizarPedidos(pedidos) {
    const lista = document.getElementById('lista-pedidos');
    const vazio = document.getElementById('feed-vazio');
    const contador = document.getElementById('contador-pedidos');
    const modelo = document.getElementById('modelo-card-pedido');

    lista.innerHTML = '';
    vazio.hidden = pedidos.length > 0;

    contador.textContent = pedidos.length === 1
        ? '1 pedido aberto aguardando profissional'
        : `${pedidos.length} pedidos abertos aguardando profissional`;

    pedidos.forEach((pedido) => {
        const card = modelo.content.cloneNode(true);
        const chave = (pedido.categoria || '').toLowerCase();
        const categoria = categoriasPorSlug[chave] || { sigla: '??', cor: '#134e48' };

        const avatar = card.querySelector('.avatar-categoria');
        avatar.textContent = categoria.sigla;
        avatar.style.setProperty('--cor-categoria', categoria.cor);

        // textContent evita que texto digitado pelo cliente vire HTML
        card.querySelector('.badge-categoria').textContent = categoria.nome || pedido.categoria || 'Serviço';
        card.querySelector('.card-tempo').textContent = tempoDesde(pedido.created_at);
        card.querySelector('.card-cliente').textContent = pedido.cliente_nome || '';
        card.querySelector('.card-descricao').textContent = pedido.descricao || 'Sem descrição.';
        card.querySelector('.texto-endereco').textContent = pedido.endereco || 'Endereço não informado';

        const botao = card.querySelector('.btn-aceitar');
        botao.addEventListener('click', () => aceitarPedido(pedido.id, botao));

        lista.appendChild(card);
    });
}


// Aceita o pedido: status -> 'em_andamento' e grava o profissional
async function aceitarPedido(pedidoId, botao) {
    botao.disabled = true;
    botao.textContent = 'Aceitando...';

    // O filtro status = 'aberto' impede que dois profissionais aceitem o mesmo pedido
    const { data, error } = await supabaseClient
        .from('pedidos')
        .update({ status: 'em_andamento', profissional_id: usuarioLogado.id })
        .eq('id', pedidoId)
        .eq('status', 'aberto')
        .select();

    if (error || !data || data.length === 0) {
        console.error(error);
        alert('Este pedido não está mais disponível. Talvez outro profissional já tenha aceitado.');
        await carregarPedidos();
        return;
    }

    window.location.href = `servico-andamento.html?pedido=${pedidoId}`;
}


// Ex.: "há 5 min", "há 2 h", "há 3 dias"
function tempoDesde(dataTexto) {
    if (!dataTexto) return '';

    const minutos = Math.floor((Date.now() - new Date(dataTexto).getTime()) / 60000);

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;

    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}