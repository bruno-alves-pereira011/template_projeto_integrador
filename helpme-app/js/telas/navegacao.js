// NAVEGAÇÃO POR PAPEL (navegacao.js) — DEBT-009
// OBJETIVO: o menu lateral mostra os caminhos de quem está logado, e o "Voltar" das telas não cria
// um vaivém no histórico do navegador.
// POR QUÊ: antes todos os links das páginas públicas levavam a home-cliente.html. O profissional que
// abria o próprio perfil público só tinha saídas para a home do cliente e ficava preso entre as duas
// telas. E o "Voltar" era um link comum: empilhava a página anterior de novo, e o botão voltar do
// navegador trazia o usuário de volta à tela que ele tinha acabado de deixar.
// COMO USAR (no HTML):
//   <nav class="sidebar-menu" data-menu-papel>   o menu é montado AQUI, a partir de ITENS_MENU (uma lista
//       só para todas as páginas). O que estiver dentro do <nav> no HTML é o que fica se este script não rodar.
//   <a ... data-menu-conta>                       vira "Entrar" (visitante) ou o botão "Sair" (#btn-sair).
//   data-sair-para="pagina.html" no <nav>         para onde o "Sair" leva (páginas que exigem login).
//                                                 Sem ele, o "Sair" recarrega a página, agora como visitante.
//   data-voltar-historico em um link              se a entrada anterior DESTA aba for o destino do link,
//                                                 volta pelo histórico em vez de empilhar.
// O menu é só visual: quem decide o acesso é exigirSessao (js/servicos/sessao.js) e o RLS do banco.
// DEPENDE DE (nesta ordem): js/servicos/supabase-config.js -> js/servicos/sessao.js -> este arquivo.
// Global criada aqui (NÃO redeclarar): montarNavegacao.


// Lê o papel de quem está vendo e monta o menu. Chamadas repetidas devolvem a mesma promessa.
// montarNavegacao(sessao) aceita o resultado de exigirSessao() para não repetir as consultas.
// Nunca rejeita. Resultado: { papel, uid, usuario, paginaInicial, perfilPublico }
//   papel: 'visitante' | 'cliente' | 'profissional' | 'admin' | 'desconhecido' (há sessão, mas o papel
//          não pôde ser lido: o menu mostra só Início e Sair);
//   paginaInicial: para onde o login leva este usuário (pode ser a tela de bloqueio ou completar perfil);
//   perfilPublico: 'profissional.html?id=<uid>' só para profissional liberado; senão null.
const montarNavegacao = (function () {
    'use strict';

    const VISITANTE = { papel: 'visitante', uid: null, usuario: null, paginaInicial: 'home-cliente.html', perfilPublico: null };

    // Ordem errada dos scripts: avisa com clareza e deixa a página funcionar com o menu do HTML.
    if (typeof supabaseClient === 'undefined' || typeof lerPapel !== 'function') {
        console.error('js/telas/navegacao.js precisa de js/servicos/supabase-config.js e js/servicos/sessao.js '
            + 'carregados ANTES dele. O menu fica como está no HTML.');
        return function montarNavegacaoIndisponivel() {
            return Promise.resolve(VISITANTE);
        };
    }

    const ICONES = {
        inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
        contratacoes: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        painel: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        publico: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        entrar: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
        sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
    };

    // O menu de TODAS as páginas. papeis: quem vê ('todos' = qualquer um). href(info): destino;
    // um item cujo destino der vazio não aparece (ex.: perfil público de quem não está aprovado).
    const ITENS_MENU = [
        { texto: 'Início', icone: 'inicio', papeis: ['todos'], href: () => PAGINA_INICIAL_CLIENTE },
        { texto: 'Minhas contratações', icone: 'contratacoes', papeis: ['cliente'], href: () => 'contratacoes.html' },
        { texto: 'Meu perfil', icone: 'perfil', papeis: ['cliente'], href: () => 'meu-perfil.html' },
        { texto: 'Meu painel', icone: 'painel', papeis: ['profissional', 'admin'], href: (info) => info.paginaInicial },
        { texto: 'Editar meu perfil', icone: 'editar', papeis: ['profissional'], href: () => PAGINA_COMPLETAR_PERFIL },
        { texto: 'Meu perfil público', icone: 'publico', papeis: ['profissional'], href: (info) => info.perfilPublico }
    ];

    let promessa = null;
    let uidMostrado = null; // de quem é o menu na tela (null = visitante)
    let voltando = false;   // um "Voltar" pelo histórico já foi disparado

    function infoDoPapel(uid, papelLido) {
        const liberado = papelLido.papel === 'profissional' && profissionalLiberado(papelLido.situacao);
        return {
            papel: papelLido.papel,
            uid: uid,
            usuario: papelLido.usuario || null,
            paginaInicial: destinoDoPapel(papelLido, null),
            perfilPublico: liberado ? 'profissional.html?id=' + encodeURIComponent(uid) : null
        };
    }

    function papelDesconhecido(uid) {
        return { papel: 'desconhecido', uid: uid, usuario: null, paginaInicial: PAGINA_INICIAL_CLIENTE, perfilPublico: null };
    }

    async function lerQuemVe() {
        if (!supabaseClient) return VISITANTE;

        let uid;
        try {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            uid = data && data.session ? data.session.user.id : null;
        } catch (falha) {
            console.error('Erro ao ler a sessão para o menu:', falha);
            uid = uidDaSessaoSalva();
            return uid ? papelDesconhecido(uid) : VISITANTE;
        }

        if (!uid) return VISITANTE;

        try {
            return infoDoPapel(uid, await lerPapel(uid));
        } catch (falha) {
            // Há sessão, mas o papel não pôde ser lido: o uid basta para a página reconhecer o próprio perfil.
            console.error('Erro ao ler o papel do usuário para o menu:', falha);
            return papelDesconhecido(uid);
        }
    }

    function criarIcone(nome) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = ICONES[nome]; // marcação fixa deste arquivo, nunca dado do banco
        return svg;
    }

    // O link leva à página aberta agora? (mesmo arquivo e os mesmos parâmetros que o link exige)
    function ehPaginaAtual(href) {
        const destino = new URL(href, window.location.href);
        const atual = new URL(window.location.href);
        if (destino.pathname !== atual.pathname) return false;
        for (const [chave, valor] of destino.searchParams) {
            if (atual.searchParams.get(chave) !== valor) return false;
        }
        return true;
    }

    function criarItem(item, href) {
        const link = document.createElement('a');
        link.className = 'menu-item';
        link.href = href;
        if (ehPaginaAtual(href)) {
            link.classList.add('ativo');
            link.setAttribute('aria-current', 'page');
        }
        link.append(criarIcone(item.icone), document.createTextNode(item.texto));
        return link;
    }

    function criarConta(info) {
        if (info.papel === 'visitante') {
            const entrar = document.createElement('a');
            entrar.href = PAGINA_LOGIN;
            entrar.className = 'menu-item menu-sair';
            entrar.append(criarIcone('entrar'), document.createTextNode('Entrar'));
            return entrar;
        }

        const sair = document.createElement('button');
        sair.type = 'button';
        sair.id = 'btn-sair';
        sair.className = 'menu-item menu-sair';
        sair.append(criarIcone('sair'), document.createTextNode('Sair'));
        sair.addEventListener('click', aoClicarSair);
        return sair;
    }

    // Monta o menu e o "Entrar"/"Sair" para o papel. 'carregando' = há sessão salva e o papel ainda vem do banco.
    function aplicar(info) {
        uidMostrado = info.uid;

        const nav = document.querySelector('[data-menu-papel]');
        if (nav) {
            const itens = [];
            ITENS_MENU.forEach((item) => {
                if (!item.papeis.includes('todos') && !item.papeis.includes(info.papel)) return;
                const href = item.href(info);
                if (href) itens.push(criarItem(item, href));
            });
            nav.replaceChildren(...itens);
        }

        const contaAtual = document.querySelector('[data-menu-conta]');
        if (contaAtual) {
            const conta = criarConta(info);
            conta.setAttribute('data-menu-conta', '');
            contaAtual.replaceWith(conta);
        }
    }

    async function aoClicarSair(evento) {
        const botao = evento.currentTarget;
        if (botao.disabled) return;
        botao.disabled = true; // clique duplo não dispara dois signOut

        await encerrarSessao(); // sem rede, apaga a sessão salva mesmo assim

        const nav = document.querySelector('[data-menu-papel]');
        const destino = nav ? voltarSeguro(nav.dataset.sairPara || '') : null;
        if (destino) {
            window.location.replace(destino);
        } else {
            window.location.reload(); // página pública: continua nela, agora como visitante
        }
    }

    // Entrada anterior DESTA aba no histórico (Navigation API), ou null se não houver ou se o
    // navegador não souber dizer. history.length não serve: conta também as páginas "à frente"
    // e as de antes de uma aba aberta com Ctrl+clique.
    function entradaAnteriorDaAba() {
        const navegacao = window.navigation;
        if (!navegacao || typeof navegacao.entries !== 'function' || !navegacao.currentEntry) return null;

        const indice = navegacao.currentEntry.index;
        if (typeof indice !== 'number' || indice < 1) return null;

        const anterior = navegacao.entries()[indice - 1];
        return anterior && anterior.url ? anterior.url : null;
    }

    function mesmoEndereco(a, b) {
        return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
    }

    // Clique simples num link data-voltar-historico: se a entrada anterior da aba é o destino dele,
    // history.back() em vez de empilhar. Ctrl/Cmd/Shift/Alt/botão do meio continuam abrindo
    // em nova aba/janela. Sem a Navigation API, o link navega normalmente.
    function aoClicarVoltar(evento) {
        const link = evento.target instanceof Element ? evento.target.closest('a[data-voltar-historico]') : null;
        if (!link) return;
        if (evento.defaultPrevented || evento.button !== 0
            || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

        // Clique duplo/triplo: o primeiro já está voltando; os outros não recuam mais páginas.
        if (voltando) {
            evento.preventDefault();
            return;
        }

        const anterior = entradaAnteriorDaAba();
        if (!anterior) return;

        let enderecoAnterior;
        let destino;
        try {
            enderecoAnterior = new URL(anterior);
            destino = new URL(link.href, window.location.href); // lido no clique: a página pode ter trocado o href
        } catch (falha) {
            return;
        }

        if (mesmoEndereco(enderecoAnterior, destino)) {
            evento.preventDefault();
            voltando = true;
            window.history.back();
        }
    }

    // Login/logout em outra aba, ou volta para uma cópia da página guardada pelo navegador (bfcache)
    // depois de sair: se a sessão salva não é mais a do menu na tela, recarrega a página.
    function conferirSessaoDaTela() {
        if (uidDaSessaoSalva() !== uidMostrado) window.location.reload();
    }

    document.addEventListener('click', aoClicarVoltar);

    window.addEventListener('pageshow', (evento) => {
        voltando = false;
        if (evento.persisted) conferirSessaoDaTela();
    });

    window.addEventListener('storage', (evento) => {
        if (evento.key === null || evento.key === chaveDaSessaoSalva()) conferirSessaoDaTela();
    });

    // Já na carga do script (antes de qualquer consulta): quem tem sessão salva não vê "Entrar"
    // piscando enquanto o papel vem do banco; vê Início e Sair até o menu completo chegar.
    const uidSalvo = uidDaSessaoSalva();
    aplicar(uidSalvo ? { ...papelDesconhecido(uidSalvo), papel: 'carregando' } : VISITANTE);

    return function montarNavegacao(sessaoJaLida) {
        if (promessa) return promessa;

        const leitura = sessaoJaLida && sessaoJaLida.user
            ? Promise.resolve(infoDoPapel(sessaoJaLida.user.id, sessaoJaLida))
            : lerQuemVe();

        promessa = leitura
            .catch((falha) => {
                console.error('Erro ao montar o menu:', falha);
                return VISITANTE;
            })
            .then((info) => {
                aplicar(info);
                return info;
            });

        return promessa;
    };
})();
