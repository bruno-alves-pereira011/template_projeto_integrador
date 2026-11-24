// FILA DE ANÁLISE (admin-analise.js) — US-015
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. exigirSessao('admin'): visitante vai ao login; quem não é admin vai para a própria página.
//   2. rpc('fila_analise'): pendentes com triagem, motivos e tempo na fila (FR17).
//   3. Aprovação em lote (FR19): só os de triagem verde podem ser marcados. O banco confere de novo
//      na hora (BR15) e devolve aprovados e ignorados; a tela mostra os dois e recarrega a fila.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);

    let fila = [];
    const selecionados = new Set();
    let decidindo = false;


    // ==========================================
    // ESTADOS
    // ==========================================
    function mostrarEstado(estado) {
        el('fila-carregando').hidden = estado !== 'carregando';
        el('fila-erro').hidden = estado !== 'erro';
        el('fila-conteudo').hidden = estado !== 'conteudo';
        el('fila-vazia').hidden = estado !== 'vazia';
    }

    function atualizarBotaoLote() {
        const botao = el('btn-aprovar-lote');
        botao.disabled = decidindo || selecionados.size === 0;
        botao.textContent = decidindo ? 'Aprovando...' : `Aprovar selecionados (${selecionados.size})`;
    }


    // ==========================================
    // CARREGAR E DESENHAR
    // ==========================================
    async function carregar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('admin');
            if (!sessao) return; // já redirecionou

            const { data, error } = await supabaseClient.rpc('fila_analise');
            if (error) throw error;

            fila = data || [];
            // Seleção só sobrevive para quem continua na fila e verde.
            const verdes = new Set(fila.filter((p) => p.triagem === 'verde').map((p) => p.id));
            [...selecionados].forEach((id) => { if (!verdes.has(id)) selecionados.delete(id); });

            el('fila-total').textContent = fila.length === 1
                ? '1 profissional aguardando aprovação.'
                : `${fila.length} profissionais aguardando aprovação.`;

            if (!fila.length) {
                mostrarEstado('vazia');
                return;
            }

            el('aviso-lote').hidden = false;
            desenhar();
            mostrarEstado('conteudo');
        } catch (falha) {
            console.error('Erro ao carregar a fila de análise:', falha);
            el('fila-erro-texto').textContent = adm.traduzirErro(falha);
            mostrarEstado('erro');
        }
    }

    function desenhar() {
        const filtro = el('filtro-triagem').value;
        const lista = el('lista-fila');
        const modelo = el('modelo-card-fila');

        const visiveis = fila.filter((p) => filtro === 'todos' || (p.triagem || 'sem') === filtro);

        lista.replaceChildren();
        el('fila-filtro-vazio').hidden = visiveis.length > 0;

        visiveis.forEach((p) => {
            const card = modelo.content.cloneNode(true);
            const triagem = adm.triagem(p.triagem);

            // Tudo por textContent: nada do banco vira HTML.
            card.querySelector('.card-fila-nome').textContent = p.nome || 'Sem nome';

            const selo = card.querySelector('.selo-triagem');
            selo.textContent = triagem.texto;
            selo.classList.add(triagem.classe);

            const local = [p.bairro, p.cidade].filter(Boolean).join(', ');
            card.querySelector('.card-fila-local').textContent = local || 'Local não informado';
            card.querySelector('.card-fila-categorias').textContent =
                p.categorias && p.categorias.length ? p.categorias.join(', ') : 'Sem categoria';
            card.querySelector('.card-fila-tempo').textContent = `Na fila ${adm.tempoDesde(p.na_fila_desde)}`;

            const motivos = card.querySelector('.card-fila-motivos');
            (p.triagem_motivos || []).forEach((motivo) => {
                const item = document.createElement('li');
                item.textContent = motivo;
                motivos.appendChild(item);
            });
            motivos.hidden = !(p.triagem_motivos || []).length;

            const caixa = card.querySelector('.selecionar');
            const podeLote = p.triagem === 'verde';
            caixa.value = p.id;
            caixa.disabled = !podeLote || decidindo;
            caixa.checked = selecionados.has(p.id);
            caixa.setAttribute('aria-label', podeLote
                ? `Selecionar ${p.nome} para aprovação em lote`
                : `${p.nome}: só triagem verde entra na aprovação em lote`);
            caixa.addEventListener('change', () => {
                if (caixa.checked) selecionados.add(p.id); else selecionados.delete(p.id);
                atualizarBotaoLote();
            });

            const detalhe = card.querySelector('.card-fila-detalhe');
            detalhe.href = `admin-profissional.html?id=${encodeURIComponent(p.id)}`;
            detalhe.setAttribute('aria-label', `Ver detalhes e decidir: ${p.nome}`);

            lista.appendChild(card);
        });

        atualizarBotaoLote();
    }


    // ==========================================
    // APROVAÇÃO EM LOTE
    // ==========================================
    function mostrarResultado(linhas, erroTexto) {
        const area = el('resultado-lote');
        area.replaceChildren();

        if (erroTexto) {
            area.className = 'resultado-lote resultado-erro';
            const p = document.createElement('p');
            p.textContent = erroTexto;
            area.appendChild(p);
        } else {
            const aprovados = linhas.filter((l) => l.situacao === 'aprovado');
            const ignorados = linhas.filter((l) => l.situacao !== 'aprovado');
            area.className = 'resultado-lote' + (ignorados.length ? ' resultado-parcial' : '');

            const titulo = document.createElement('p');
            titulo.className = 'resultado-titulo';
            titulo.textContent = `${aprovados.length} aprovado(s)` +
                (ignorados.length ? `, ${ignorados.length} não aprovado(s).` : '.');
            area.appendChild(titulo);

            if (ignorados.length) {
                const lista = document.createElement('ul');
                ignorados.forEach((l) => {
                    const item = document.createElement('li');
                    item.textContent = `${l.nome || 'Cadastro'}: ${l.detalhe || 'ignorado'}`;
                    lista.appendChild(item);
                });
                area.appendChild(lista);
            }
        }

        area.hidden = false;
        area.focus();
    }

    async function aprovarLote() {
        if (decidindo || !selecionados.size) return;

        const ids = [...selecionados];
        if (!window.confirm(`Aprovar ${ids.length} profissional(is)? Eles passam a aparecer no diretório.`)) return;

        decidindo = true;
        atualizarBotaoLote();

        try {
            const { data, error } = await supabaseClient.rpc('decidir_profissionais', {
                p_ids: ids,
                p_acao: 'aprovar',
                p_motivo: null,
                p_exigir_verde: true
            });
            if (error) throw error;

            selecionados.clear();
            mostrarResultado(data || []);
        } catch (falha) {
            console.error('Erro na aprovação em lote:', falha);
            mostrarResultado([], adm.traduzirErro(falha));
        } finally {
            decidindo = false;
            await carregar();
            // carregar() pode ter trocado o estado; o resultado continua visível acima da lista.
        }
    }


    el('filtro-triagem').addEventListener('change', desenhar);
    el('btn-aprovar-lote').addEventListener('click', aprovarLote);
    el('btn-tentar-novamente').addEventListener('click', carregar);
    el('btn-sair').addEventListener('click', sair);

    carregar();
})();
