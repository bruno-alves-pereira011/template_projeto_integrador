// LISTA DE PROFISSIONAIS POR CATEGORIA (profissionais.js) — US-002 / HU01
// OBJETIVO: Em profissionais.html?categoria=<slug>, mostrar os profissionais APROVADOS da categoria,
// com filtro por cidade e bairro. Página pública: funciona com ou sem login.
// O QUE FAZ AQUI:
// - Busca a categoria (nome/cor) via carregarCategorias() e os profissionais na view 'profissionais_publicos'
//   (a view só tem aprovados e não expõe data de nascimento). NUNCA lê a tabela 'profissionais' direto.
// - Desenha um card por profissional, que leva para 'profissional.html?id=<id>&categoria=<slug>'.
// - Estados: carregando, erro (com "Tentar novamente"), vazio, sem resultado no filtro e categoria não encontrada.
// DEPENDE DE: supabase-config.js e categorias.js carregados antes deste arquivo.
// Tudo fica dentro de uma IIFE para não criar variáveis globais (evita colidir com outros scripts).

(function () {
    'use strict';

    // Slug da categoria vindo da URL (ex.: ?categoria=encanador)
    const slugCategoria = (new URLSearchParams(window.location.search).get('categoria') || '').trim();

    // Profissionais vindos do banco; guardados para o filtro funcionar sem consultar o Supabase de novo
    let profissionaisCarregados = [];

    // Evita que uma resposta antiga (ex.: clique duplo em "Tentar novamente") sobrescreva a mais nova
    let consultaAtual = 0;

    // Atalho para pegar elementos pelo id
    const el = (id) => document.getElementById(id);

    document.addEventListener('DOMContentLoaded', () => {
        configurarCabecalhoSessao();

        el('filtro-cidade').addEventListener('input', renderizarProfissionais);
        el('filtro-bairro').addEventListener('input', renderizarProfissionais);

        // Enter no campo não deve recarregar a página
        el('filtros-profissionais').addEventListener('submit', (e) => e.preventDefault());

        el('btn-limpar-filtros').addEventListener('click', () => {
            el('filtro-cidade').value = '';
            el('filtro-bairro').value = '';
            renderizarProfissionais();
            el('filtro-cidade').focus();
        });

        el('btn-tentar-novamente').addEventListener('click', carregarPagina);

        carregarPagina();
    });


    // Busca a categoria e os profissionais e decide qual estado mostrar
    async function carregarPagina() {
        const minhaConsulta = ++consultaAtual;

        mostrarEstado('carregando');

        // Sem slug na URL: nem consulta o banco
        if (!slugCategoria) {
            mostrarCategoriaNaoEncontrada();
            return;
        }

        try {
            // As duas consultas são independentes: rodam ao mesmo tempo
            const [categorias, profissionais] = await Promise.all([
                carregarCategorias(),
                buscarProfissionaisDaCategoria(slugCategoria)
            ]);

            if (minhaConsulta !== consultaAtual) return;

            const categoria = mapaCategoriasPorSlug(categorias)[slugCategoria];

            if (!categoria) {
                mostrarCategoriaNaoEncontrada();
                return;
            }

            mostrarCabecalhoCategoria(categoria);
            profissionaisCarregados = profissionais;
            el('filtros-profissionais').hidden = profissionais.length === 0;
            mostrarEstado('lista');
            renderizarProfissionais();
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;

            // Detalhe técnico só no console; o usuário vê uma mensagem amigável
            console.error('Erro ao carregar profissionais:', falha);
            profissionaisCarregados = [];
            mostrarEstado('erro');
        }
    }


    // Consulta a view pública filtrando pela categoria (coluna 'categorias' é um array de slugs).
    // Lança erro em caso de falha, para a tela mostrar o estado de erro.
    async function buscarProfissionaisDaCategoria(slug) {
        if (!supabaseClient) {
            throw new Error('Cliente do Supabase indisponível.');
        }

        const { data, error } = await supabaseClient
            .from('profissionais_publicos')
            .select('id, nome, cidade, bairro, media_notas, total_avaliacoes')
            .contains('categorias', [slug])
            .order('nome', { ascending: true });

        if (error) throw error;

        return data || [];
    }


    // Mostra só um dos blocos de estado da tela
    function mostrarEstado(estado) {
        el('profissionais-carregando').hidden = estado !== 'carregando';
        el('profissionais-erro').hidden = estado !== 'erro';
        el('categoria-nao-encontrada').hidden = estado !== 'nao-encontrada';
        el('lista-profissionais').hidden = estado !== 'lista';

        // Vazio e "sem resultado" são decididos em renderizarProfissionais()
        el('profissionais-vazio').hidden = true;
        el('profissionais-sem-resultado').hidden = true;

        if (estado !== 'lista') {
            el('lista-profissionais').replaceChildren();
            el('filtros-profissionais').hidden = true;
        }
    }


    function mostrarCategoriaNaoEncontrada() {
        el('titulo-categoria').textContent = 'Categoria não encontrada';
        el('subtitulo-categoria').textContent = 'Escolha um serviço na página inicial.';
        document.title = 'HelpMe - Categoria não encontrada';
        mostrarEstado('nao-encontrada');
    }


    function mostrarCabecalhoCategoria(categoria) {
        el('titulo-categoria').textContent = categoria.nome;
        el('subtitulo-categoria').textContent = categoria.descricao
            ? categoria.descricao
            : 'Profissionais aprovados que atendem nesta categoria.';
        document.title = `HelpMe - ${categoria.nome}`;
    }


    // Desenha os cards, aplicando os filtros de cidade e bairro
    function renderizarProfissionais() {
        const lista = el('lista-profissionais');
        const modelo = el('modelo-card-profissional');
        const cidade = normalizarTexto(el('filtro-cidade').value);
        const bairro = normalizarTexto(el('filtro-bairro').value);

        const encontrados = profissionaisCarregados.filter((prof) =>
            normalizarTexto(prof.cidade).includes(cidade) &&
            normalizarTexto(prof.bairro).includes(bairro)
        );

        lista.replaceChildren();

        // Categoria sem nenhum aprovado x filtro que não achou ninguém
        el('profissionais-vazio').hidden = profissionaisCarregados.length > 0;
        el('profissionais-sem-resultado').hidden =
            profissionaisCarregados.length === 0 || encontrados.length > 0;

        encontrados.forEach((prof) => {
            const card = modelo.content.cloneNode(true);

            // O slug vai junto para o "Voltar" do perfil retornar a esta lista
            card.querySelector('.card-profissional').href =
                `profissional.html?id=${encodeURIComponent(prof.id)}&categoria=${encodeURIComponent(slugCategoria)}`;

            // textContent (e não innerHTML) impede que um texto do banco vire HTML/script na página
            card.querySelector('.avatar-profissional').textContent = iniciais(prof.nome);
            card.querySelector('.card-profissional-nome').textContent = prof.nome || 'Profissional';
            card.querySelector('.card-profissional-local').textContent = textoLocal(prof);
            preencherNota(card.querySelector('.card-profissional-nota'), prof);

            lista.appendChild(card);
        });
    }


    // "Centro, São Paulo" (ou o que estiver preenchido)
    function textoLocal(prof) {
        const partes = [prof.bairro, prof.cidade].filter((parte) => parte && parte.trim());
        return partes.length ? partes.join(', ') : 'Local não informado';
    }


    // "4,5 de 5 · 2 avaliações" ou "Sem avaliações"
    function preencherNota(elemento, prof) {
        const media = prof.media_notas === null || prof.media_notas === undefined
            ? null
            : Number(prof.media_notas);

        if (media === null || Number.isNaN(media)) {
            elemento.textContent = 'Sem avaliações';
            elemento.classList.add('sem-avaliacoes');
            return;
        }

        const total = Number(prof.total_avaliacoes) || 0;
        const estrela = document.createElement('span');
        estrela.className = 'nota-estrela';
        estrela.setAttribute('aria-hidden', 'true');
        estrela.textContent = '★';

        const texto = document.createElement('span');
        texto.textContent = `Nota ${media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 · ` +
            `${total} ${total === 1 ? 'avaliação' : 'avaliações'}`;

        elemento.replaceChildren(estrela, ' ', texto);
    }


    // "João Encanador" -> "JE"
    function iniciais(nome) {
        const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return '?';
        const primeira = partes[0][0];
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
        return (primeira + ultima).toUpperCase();
    }


    // Minúsculo e sem acento: "são paulo" encontra "São Paulo"
    function normalizarTexto(texto) {
        return (texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    }


    // ==========================================
    // CABEÇALHO: "Entrar" (visitante) ou "Sair" (logado)
    // ==========================================
    async function configurarCabecalhoSessao() {
        const btnSair = el('btn-sair');

        btnSair.addEventListener('click', async () => {
            try {
                if (supabaseClient) await supabaseClient.auth.signOut();
            } catch (falha) {
                console.error('Erro ao sair:', falha);
            }
            // Continua nesta lista, agora como visitante
            window.location.reload();
        });

        if (!supabaseClient) return;

        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            if (!data.session) return;

            el('link-entrar').hidden = true;
            btnSair.hidden = false;
        } catch (falha) {
            // Sem sessão legível, a página continua como visitante ("Entrar" visível)
            console.error('Erro ao ler a sessão:', falha);
        }
    }
})();
