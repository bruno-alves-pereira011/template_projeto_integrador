// PERFIL DO PROFISSIONAL (perfil-profissional.js) — US-003 / HU02-HU03
// OBJETIVO: Em profissional.html?id=<uuid>&categoria=<slug>, mostrar o perfil de um profissional APROVADO
// e os botões "Ligar" (tel:) e "WhatsApp" (wa.me). Página pública: funciona com ou sem login.
// O QUE FAZ AQUI:
// - Lê o profissional na view 'profissionais_publicos' (só aprovados, sem data de nascimento).
//   NUNCA lê a tabela 'profissionais' direto.
// - Monta os chips de categoria com cor/sigla da tabela 'categorias' (via carregarCategorias()).
// - Esconde cada botão de contato quando o número é inválido (regras em js/telefone.js).
// - Estados: carregando, erro (com "Tentar novamente") e "Profissional não encontrado".
// - O "Voltar" leva para a lista da categoria de origem (?categoria=) ou para a home.
// DEPENDE DE: supabase-config.js, categorias.js e telefone.js carregados antes deste arquivo.
// Tudo fica dentro de uma IIFE para não criar variáveis globais (evita colidir com outros scripts).

(function () {
    'use strict';

    const parametros = new URLSearchParams(window.location.search);
    const idProfissional = (parametros.get('id') || '').trim();
    const slugOrigem = (parametros.get('categoria') || '').trim();

    // Os ids dos profissionais são UUIDs (vêm do Auth). Outro formato nem chega ao banco.
    const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Slug aceito no link "Voltar" (letras, números, hífen e sublinhado)
    const FORMATO_SLUG = /^[a-z0-9_-]{1,64}$/i;

    // Evita que uma resposta antiga sobrescreva a mais nova (clique duplo em "Tentar novamente")
    let consultaAtual = 0;

    const el = (id) => document.getElementById(id);

    document.addEventListener('DOMContentLoaded', () => {
        configurarCabecalhoSessao();
        configurarLinksVoltar();

        el('btn-tentar-novamente').addEventListener('click', carregarPerfil);

        carregarPerfil();
    });


    // "Voltar" para profissionais.html?categoria=<slug> quando a origem é conhecida; senão, home
    function configurarLinksVoltar() {
        if (!FORMATO_SLUG.test(slugOrigem)) return;

        const destino = `profissionais.html?categoria=${encodeURIComponent(slugOrigem)}`;
        el('link-voltar').href = destino;
        el('texto-voltar').textContent = 'Voltar para a lista';
        el('link-voltar-nao-encontrado').href = destino;
        el('link-voltar-nao-encontrado').textContent = 'Voltar para a lista';
    }


    async function carregarPerfil() {
        const minhaConsulta = ++consultaAtual;

        mostrarEstado('carregando');

        // id ausente ou com formato inválido: "não encontrado" sem consultar o banco
        if (!FORMATO_UUID.test(idProfissional)) {
            mostrarEstado('nao-encontrado');
            return;
        }

        try {
            // Perfil e categorias rodam ao mesmo tempo. Se só as categorias falharem,
            // o perfil ainda aparece (os chips mostram o slug, sem cor).
            const [profissional, categorias] = await Promise.all([
                buscarProfissional(idProfissional),
                carregarCategorias().catch((falha) => {
                    console.error('Erro ao carregar categorias (os chips ficam sem cor):', falha);
                    return [];
                })
            ]);

            if (minhaConsulta !== consultaAtual) return;

            // Inexistente ou não aprovado: a view simplesmente não devolve a linha
            if (!profissional) {
                mostrarEstado('nao-encontrado');
                return;
            }

            preencherPerfil(profissional, mapaCategoriasPorSlug(categorias));
            mostrarEstado('perfil');
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;

            // Detalhe técnico só no console; o usuário vê uma mensagem amigável
            console.error('Erro ao carregar o perfil:', falha);
            mostrarEstado('erro');
        }
    }


    // Busca um profissional APROVADO pelo id. Retorna o objeto ou null se não existir. Lança erro em falha.
    async function buscarProfissional(id) {
        if (!supabaseClient) {
            throw new Error('Cliente do Supabase indisponível.');
        }

        const { data, error } = await supabaseClient
            .from('profissionais_publicos')
            .select('id, nome, whatsapp, telefone, cidade, bairro, descricao, categorias, media_notas, total_avaliacoes')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        return data;
    }


    function mostrarEstado(estado) {
        el('perfil-carregando').hidden = estado !== 'carregando';
        el('perfil-profissional').hidden = estado !== 'perfil';
        el('perfil-erro').hidden = estado !== 'erro';
        el('perfil-nao-encontrado').hidden = estado !== 'nao-encontrado';

        if (estado === 'nao-encontrado') {
            document.title = 'HelpMe - Profissional não encontrado';
        }
    }


    // Preenche a tela só com textContent / atributos (nada de innerHTML com dados do banco)
    function preencherPerfil(prof, categoriasPorSlug) {
        const nome = (prof.nome || '').trim() || 'Profissional';

        document.title = `HelpMe - ${nome}`;
        el('perfil-nome').textContent = nome;
        el('perfil-iniciais').textContent = iniciais(nome);
        el('perfil-local').textContent = textoLocal(prof);
        el('perfil-nota').textContent = textoNota(prof);
        el('perfil-descricao').textContent = (prof.descricao || '').trim() || 'Este profissional ainda não escreveu uma descrição.';

        // A cor do avatar segue a categoria de origem (ou a primeira do profissional)
        const slugs = Array.isArray(prof.categorias) ? prof.categorias : [];
        const categoriaPrincipal = categoriasPorSlug[slugOrigem] && slugs.includes(slugOrigem)
            ? categoriasPorSlug[slugOrigem]
            : categoriasPorSlug[slugs[0]];
        if (categoriaPrincipal && categoriaPrincipal.cor) {
            el('perfil-iniciais').style.setProperty('--cor-categoria', categoriaPrincipal.cor);
        }

        preencherCategorias(slugs, categoriasPorSlug);
        preencherContato(prof, nome);
    }


    function preencherCategorias(slugs, categoriasPorSlug) {
        const lista = el('perfil-categorias');
        const modelo = el('modelo-chip-categoria');

        lista.replaceChildren();

        slugs.forEach((slug) => {
            const categoria = categoriasPorSlug[slug];
            const chip = modelo.content.cloneNode(true);
            const sigla = chip.querySelector('.chip-categoria-sigla');

            sigla.textContent = categoria && categoria.sigla ? categoria.sigla : slug.slice(0, 2).toUpperCase();
            if (categoria && categoria.cor) {
                sigla.style.setProperty('--cor-categoria', categoria.cor);
            }
            chip.querySelector('.chip-categoria-nome').textContent = categoria ? categoria.nome : slug;

            lista.appendChild(chip);
        });

        el('perfil-categorias').closest('.perfil-secao').hidden = slugs.length === 0;
    }


    // Cada botão só aparece com número válido (normalizarTelefone devolve null se não for)
    function preencherContato(prof, nome) {
        const btnLigar = el('btn-ligar');
        const btnWhatsApp = el('btn-whatsapp');

        const hrefTel = linkTel(prof.telefone);
        const hrefWhatsApp = linkWhatsApp(prof.whatsapp);

        if (hrefTel) {
            btnLigar.href = hrefTel;
            btnLigar.setAttribute('aria-label', `Ligar para ${nome}`);
        } else {
            btnLigar.removeAttribute('href');
        }
        btnLigar.hidden = !hrefTel;

        if (hrefWhatsApp) {
            btnWhatsApp.href = hrefWhatsApp;
            btnWhatsApp.setAttribute('aria-label', `Conversar com ${nome} no WhatsApp (abre em nova aba)`);
        } else {
            btnWhatsApp.removeAttribute('href');
        }
        btnWhatsApp.hidden = !hrefWhatsApp;

        el('contato-indisponivel').hidden = Boolean(hrefTel || hrefWhatsApp);
    }


    // "Centro, São Paulo" (ou o que estiver preenchido)
    function textoLocal(prof) {
        const partes = [prof.bairro, prof.cidade].filter((parte) => parte && parte.trim());
        return partes.length ? partes.join(', ') : 'Local não informado';
    }


    // "Nota 4,5 de 5 · 2 avaliações" ou "Sem avaliações"
    function textoNota(prof) {
        const media = prof.media_notas === null || prof.media_notas === undefined
            ? NaN
            : Number(prof.media_notas);
        const total = Number(prof.total_avaliacoes) || 0;

        if (Number.isNaN(media)) return 'Sem avaliações';

        const mediaFormatada = media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return `Nota ${mediaFormatada} de 5 · ${total} ${total === 1 ? 'avaliação' : 'avaliações'}`;
    }


    // "João Encanador" -> "JE"
    function iniciais(nome) {
        const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return '?';
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
        return (partes[0][0] + ultima).toUpperCase();
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
            // Continua neste perfil, agora como visitante
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
