// DETALHE DO PROFISSIONAL PARA O ADMIN (admin-profissional.js) — US-015
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. Lê ?id= (uuid). exigirSessao('admin').
//   2. rpc('detalhe_profissional_admin'): perfil, última triagem e histórico (FR18).
//   3. Aprovar / Recusar (motivo 10–500, BR16) via rpc('decidir_profissionais').
//      'ignorado' = outro admin decidiu antes (critério 5): avisa e recarrega.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);
    const MOTIVO_MIN = 10;
    const MOTIVO_MAX = 500;

    const id = new URLSearchParams(window.location.search).get('id');
    const idValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
    let decidindo = false;


    // ==========================================
    // ESTADOS E MENSAGENS
    // ==========================================
    function mostrarEstado(estado) {
        el('detalhe-carregando').hidden = estado !== 'carregando';
        el('detalhe-erro').hidden = estado !== 'erro';
        el('detalhe-nao-encontrado').hidden = estado !== 'nao-encontrado';
        el('detalhe-conteudo').hidden = estado !== 'conteudo';
    }

    function mostrarMensagem(texto, tipo) {
        const msg = el('decisao-mensagem');
        msg.textContent = texto || '';
        msg.className = 'aviso-decisao aviso-' + (tipo || 'erro');
        msg.hidden = !texto;
        if (texto) msg.focus();
    }

    function definirDecidindo(ativo) {
        decidindo = ativo;
        el('btn-aprovar').disabled = ativo;
        el('btn-recusar').disabled = ativo;
    }


    // ==========================================
    // CARREGAR E DESENHAR
    // ==========================================
    async function carregar(manterMensagem) {
        if (!manterMensagem) mostrarMensagem('');
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('admin');
            if (!sessao) return; // já redirecionou

            if (!idValido) {
                mostrarEstado('nao-encontrado');
                return;
            }

            const { data, error } = await supabaseClient.rpc('detalhe_profissional_admin', { p_id: id });
            if (error) throw error;

            if (!data) {
                mostrarEstado('nao-encontrado');
                return;
            }

            desenhar(data);
            mostrarEstado('conteudo');
        } catch (falha) {
            console.error('Erro ao carregar o detalhe do profissional:', falha);
            el('detalhe-erro-texto').textContent = adm.traduzirErro(falha);
            mostrarEstado('erro');
        }
    }

    function texto(idElemento, valor, vazio) {
        el(idElemento).textContent = valor || vazio || 'Não informado';
    }

    function desenhar(d) {
        document.title = `HelpMe - Análise de ${d.nome || 'profissional'}`;
        texto('perfil-nome', d.nome, 'Sem nome');

        const status = el('perfil-status');
        status.textContent = adm.rotuloStatus(d.status);
        status.className = 'selo-status-admin status-admin-' + d.status;

        texto('perfil-local', [d.bairro, d.cidade].filter(Boolean).join(', '));
        texto('perfil-idade', Number.isInteger(d.idade) ? `${d.idade} anos` : '');
        const contatos = [];
        const whatsapp = adm.formatarTelefone(d.whatsapp);
        const telefone = adm.formatarTelefone(d.telefone);
        if (whatsapp) contatos.push(`WhatsApp ${whatsapp}`);
        if (telefone && telefone !== whatsapp) contatos.push(`Telefone ${telefone}`);
        texto('perfil-contato', contatos.join(' · '));
        texto('perfil-cadastro', adm.formatarData(d.cadastrado_em));
        texto('perfil-categorias', (d.categorias || []).join(', '), 'Sem categoria');
        texto('perfil-descricao', d.descricao, 'Sem descrição');

        desenharTriagem(d.triagem);
        desenharHistorico(d.historico || []);

        const pendente = d.status === 'pendente';
        el('painel-decisao').hidden = !pendente;
        el('decisao-encerrada').hidden = pendente;
    }

    function desenharTriagem(t) {
        const selo = el('triagem-selo');
        const info = adm.triagem(t && t.resultado);
        selo.textContent = info.texto;
        selo.className = 'selo-triagem ' + info.classe;
        el('triagem-quando').textContent = t ? adm.formatarData(t.em) : '';

        const lista = el('triagem-checagens');
        lista.replaceChildren();
        const checagens = (t && t.checagens) || [];
        checagens.forEach((c) => {
            const item = document.createElement('li');
            item.className = c.ok ? 'checagem-ok' : 'checagem-falhou';
            item.textContent = (c.ok ? 'OK — ' : 'Atenção — ') + (c.mensagem || c.codigo || '');
            lista.appendChild(item);
        });
        lista.hidden = !checagens.length;
        el('triagem-vazia').hidden = Boolean(t);
    }

    function desenharHistorico(historico) {
        const lista = el('historico-lista');
        lista.replaceChildren();

        historico.forEach((h) => {
            const item = document.createElement('li');
            const titulo = document.createElement('strong');
            titulo.textContent = adm.rotuloAcao(h.acao) + (h.resultado ? `: ${adm.triagem(h.resultado).texto}` : '');
            const meta = document.createElement('span');
            meta.className = 'texto-suave';
            meta.textContent = ` — ${h.autor || 'Sistema'}, ${adm.formatarData(h.em)}`;
            item.append(titulo, meta);
            if (h.motivo) {
                const motivo = document.createElement('p');
                motivo.textContent = `Motivo: ${h.motivo}`;
                item.appendChild(motivo);
            }
            lista.appendChild(item);
        });

        el('historico-vazio').hidden = historico.length > 0;
    }


    // ==========================================
    // DECIDIR
    // ==========================================
    async function decidir(acao, motivo) {
        if (decidindo) return;
        definirDecidindo(true);

        try {
            const { data, error } = await supabaseClient.rpc('decidir_profissionais', {
                p_ids: [id],
                p_acao: acao,
                p_motivo: motivo || null,
                p_exigir_verde: false
            });
            if (error) throw error;

            const linha = (data || [])[0];
            if (linha && linha.situacao === 'aprovado') {
                mostrarMensagem('Profissional aprovado. Ele já aparece no diretório.', 'sucesso');
            } else if (linha && linha.situacao === 'recusado') {
                mostrarMensagem('Profissional recusado. O motivo ficou registrado no histórico.', 'sucesso');
            } else {
                // Outro admin decidiu antes (ou o cadastro mudou): avisa e recarrega (critério 5).
                mostrarMensagem(`Nada foi alterado: ${(linha && linha.detalhe) || 'o cadastro mudou'}. A tela foi atualizada.`, 'aviso');
            }
            el('motivo').value = '';
            atualizarContador();
            await carregar(true);
        } catch (falha) {
            console.error('Erro ao decidir o cadastro:', falha);
            mostrarMensagem(adm.traduzirErro(falha), 'erro');
        } finally {
            definirDecidindo(false);
        }
    }

    function atualizarContador() {
        el('motivo-contador').textContent = `${el('motivo').value.trim().length}/${MOTIVO_MAX}`;
    }

    function erroMotivo(textoErro) {
        const erro = el('erro-motivo');
        erro.textContent = textoErro || '';
        erro.hidden = !textoErro;
        if (textoErro) el('motivo').setAttribute('aria-invalid', 'true');
        else el('motivo').removeAttribute('aria-invalid');
    }

    el('btn-aprovar').addEventListener('click', () => decidir('aprovar'));

    el('form-recusa').addEventListener('submit', (evento) => {
        evento.preventDefault();
        const motivo = el('motivo').value.trim();
        if (motivo.length < MOTIVO_MIN || motivo.length > MOTIVO_MAX) {
            erroMotivo(`Explique o motivo da recusa com ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres.`);
            el('motivo').focus();
            return;
        }
        erroMotivo('');
        decidir('recusar', motivo);
    });

    el('motivo').addEventListener('input', atualizarContador);
    el('btn-tentar-novamente').addEventListener('click', () => carregar());
    el('btn-sair').addEventListener('click', sair);

    carregar();
})();
