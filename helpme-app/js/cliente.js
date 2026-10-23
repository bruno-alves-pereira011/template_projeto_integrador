// LÓGICA DA HOME PÚBLICA (cliente.js)
// OBJETIVO: Mostrar o diretório de categorias em home-cliente.html, com ou sem login.
// O QUE FAZ AQUI:
// - Busca as categorias reais no Supabase (via js/categorias.js) e desenha um card por categoria.
// - Cada card leva para 'profissionais.html?categoria=<slug>'.
// - Mostra "Entrar" para visitante e "Sair" para quem tem sessão.
// - Se a consulta falhar, mostra uma mensagem de erro (e não uma lista vazia).
// DEPENDE DE: supabase-config.js e categorias.js carregados antes deste arquivo.


// Lista vinda do banco; guardada aqui para a busca filtrar sem consultar o Supabase de novo
let categoriasCarregadas = [];

document.addEventListener('DOMContentLoaded', async () => {

    // A home é PÚBLICA: não redirecionamos para o login. A sessão só muda o cabeçalho.
    await atualizarCabecalhoSessao();

    if (document.getElementById('lista-categorias')) {
        document.getElementById('busca-categoria').addEventListener('input', (e) => {
            renderizarCategorias(e.target.value);
        });

        document.getElementById('btn-tentar-novamente').addEventListener('click', buscarEMostrarCategorias);

        await buscarEMostrarCategorias();
    }

    // ==========================================
    // BOTÃO SAIR (só aparece quando há sessão)
    // ==========================================
    const btnSair = document.getElementById('btn-sair');

    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            if (supabaseClient) await supabaseClient.auth.signOut();
            // Continua na home, agora como visitante
            window.location.href = 'home-cliente.html';
        });
    }
});


// Mostra "Entrar" (visitante) ou "Sair" + saudação (logado).
// O HTML já começa com "Entrar" visível: se o Supabase falhar, o visitante ainda consegue ir ao login.
async function atualizarCabecalhoSessao() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Erro ao ler a sessão:', error);
        return;
    }

    const sessao = data.session;
    if (!sessao) return;

    document.getElementById('link-entrar').hidden = true;
    document.getElementById('btn-sair').hidden = false;

    // O nome vem do próprio login (enviado no cadastro), sem precisar consultar outra tabela
    const nome = sessao.user.user_metadata && sessao.user.user_metadata.nome;
    if (nome) {
        document.getElementById('saudacao').textContent = `Olá, ${primeiroNome(nome)}!`;
    }
}


// Busca as categorias e trata os três estados da tela: carregando, erro e sucesso
async function buscarEMostrarCategorias() {
    const carregando = document.getElementById('categorias-carregando');
    const erro = document.getElementById('categorias-erro');

    carregando.hidden = false;
    erro.hidden = true;

    try {
        categoriasCarregadas = await carregarCategorias();
        renderizarCategorias(document.getElementById('busca-categoria').value);
    } catch (falha) {
        // Detalhe técnico só no console; o usuário vê uma mensagem amigável
        console.error('Erro ao carregar categorias:', falha);
        categoriasCarregadas = [];
        document.getElementById('lista-categorias').replaceChildren();
        document.getElementById('categorias-vazio').hidden = true;
        erro.hidden = false;
    } finally {
        carregando.hidden = true;
    }
}


// Desenha os cards de categoria, filtrando pelo texto da busca
function renderizarCategorias(textoBusca) {
    const lista = document.getElementById('lista-categorias');
    const vazio = document.getElementById('categorias-vazio');
    const modelo = document.getElementById('modelo-card-categoria');
    const busca = normalizar(textoBusca);

    const encontradas = categoriasCarregadas.filter((categoria) =>
        normalizar(categoria.nome + ' ' + (categoria.descricao || '')).includes(busca)
    );

    lista.replaceChildren();
    vazio.hidden = encontradas.length > 0;

    encontradas.forEach((categoria) => {
        const card = modelo.content.cloneNode(true);

        // encodeURIComponent garante uma URL válida mesmo se o slug tiver caractere especial
        card.querySelector('.card-categoria').href =
            `profissionais.html?categoria=${encodeURIComponent(categoria.slug)}`;

        // textContent (e não innerHTML) impede que um texto do banco vire HTML/script na página
        const avatar = card.querySelector('.avatar-categoria');
        avatar.textContent = categoria.sigla;
        avatar.style.setProperty('--cor-categoria', categoria.cor);

        card.querySelector('.card-categoria-nome').textContent = categoria.nome;
        card.querySelector('.card-categoria-descricao').textContent = categoria.descricao || '';

        lista.appendChild(card);
    });
}


// "Ana Paula Rocha" -> "Ana"
function primeiroNome(nome) {
    return (nome || '').trim().split(' ')[0];
}

// Deixa minúsculo e sem acento, para a busca achar "eletrica" em "Elétrica"
function normalizar(texto) {
    return (texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
