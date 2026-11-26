// LÓGICA DA HOME PÚBLICA (cliente.js)
// OBJETIVO: Mostrar o diretório de categorias em home-cliente.html, com ou sem login.
// O QUE FAZ AQUI:
// - Busca as categorias reais no Supabase (via js/servicos/categorias.js) e desenha um card por categoria.
// - Cada card leva para 'profissionais.html?categoria=<slug>'.
// - Saudação com o nome de quem está logado (o menu por papel vem de js/telas/navegacao.js — DEBT-009).
// - Se a consulta falhar, mostra uma mensagem de erro (e não uma lista vazia).
// DEPENDE DE: supabase-config.js, categorias.js, sessao.js e navegacao.js carregados antes deste arquivo.


// Lista vinda do banco; guardada aqui para a busca filtrar sem consultar o Supabase de novo
let categoriasCarregadas = [];

document.addEventListener('DOMContentLoaded', async () => {

    // A home é PÚBLICA: não redirecionamos para o login. A sessão só muda o menu e a saudação.
    // O menu por papel (Entrar/Sair, itens de cliente e de profissional) vem de js/telas/navegacao.js.
    montarNavegacao().then(mostrarSaudacao);

    if (document.getElementById('lista-categorias')) {
        document.getElementById('busca-categoria').addEventListener('input', (e) => {
            renderizarCategorias(e.target.value);
        });

        document.getElementById('btn-tentar-novamente').addEventListener('click', buscarEMostrarCategorias);

        await buscarEMostrarCategorias();
    }
});


// "Olá, Ana!" para quem está logado. O nome vem de 'usuarios' (as contas do seed não têm
// nome no user_metadata); sem nome legível, fica o título padrão.
function mostrarSaudacao(info) {
    const nome = info && info.usuario && info.usuario.nome;
    if (nome && primeiroNome(nome)) {
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
        // US-018: categoria desativada pelo admin não aparece na home.
        categoriasCarregadas = await carregarCategorias({ somenteAtivas: true });
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
