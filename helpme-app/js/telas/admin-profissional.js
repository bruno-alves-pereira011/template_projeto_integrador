// DETALHE DO PROFISSIONAL PARA O ADMIN (admin-profissional.js) — US-015
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. Lê ?id= (uuid). exigirSessao('admin').
//   2. rpc('detalhe_profissional_admin'): perfil, última triagem e histórico (FR18).
//   3. Aprovar / Recusar (motivo 10–500, BR16) via rpc('decidir_profissionais').
//      'ignorado' = outro admin decidiu antes (critério 5): avisa e recarrega.
//   4. US-019: aprovado -> Suspender (motivo 10–500); suspenso -> Reativar (motivo opcional),
//      via rpc('alterar_suspensao'). Mesmo padrão: 'ignorado' avisa e recarrega.
//   ?de=profissionais: veio da lista (admin-profissionais.html) — o "Voltar" e o menu apontam para ela.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);
    const MOTIVO_MIN = 10;
    const MOTIVO_MAX = 500;

    const id = new URLSearchParams(window.location.search).get('id');
    const idValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
    const veioDaLista = new URLSearchParams(window.location.search).get('de') === 'profissionais';
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
        ['btn-aprovar', 'btn-recusar', 'btn-suspender', 'btn-reativar'].forEach((b) => { el(b).disabled = ativo; });
    }

    // Veio da lista de profissionais: "Voltar" e o item ativo do menu apontam para ela.
    function ajustarOrigem() {
        if (!veioDaLista) return;
        const voltar = el('link-voltar');
        voltar.href = 'admin-profissionais.html';
        voltar.textContent = '← Voltar para a lista';
        document.querySelectorAll('.sidebar-menu .menu-item').forEach((item) => {
            const daLista = item.getAttribute('href') === 'admin-profissionais.html';
            const daFila = item.getAttribute('href') === 'admin-analise.html';
            if (daLista) item.classList.add('ativo');
            if (daFila) item.classList.remove('ativo');
        });
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
        el('link-contratacoes').href = `admin-contratacoes.html?profissional=${encodeURIComponent(id)}`; // US-020

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

        el('painel-decisao').hidden = d.status !== 'pendente';
        el('painel-suspensao').hidden = d.status !== 'aprovado';
        el('painel-reativacao').hidden = d.status !== 'suspenso';
        el('decisao-encerrada').hidden = d.status !== 'recusado';
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
            // US-021: sinal de suspeita aparece como "Suspeita"; obrigatória como "Atenção".
            const prefixo = c.ok ? 'OK — ' : (c.tipo === 'suspeita' ? 'Suspeita — ' : 'Atenção — ');
            item.textContent = prefixo + (c.mensagem || c.codigo || '');
            // Telefone repetido: link para comparar com o outro cadastro.
            if (!c.ok && typeof c.outro_id === 'string' && c.outro_id) {
                const link = document.createElement('a');
                link.className = 'btn-link-admin';
                link.href = 'admin-profissional.html?id=' + encodeURIComponent(c.outro_id);
                link.textContent = 'Ver o outro cadastro';
                item.append(' ', link);
            }
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

    // ==========================================
    // SUSPENDER / REATIVAR (US-019)
    // ==========================================
    async function alterarSuspensao(acao, motivo) {
        if (decidindo) return;
        definirDecidindo(true);

        try {
            const { data, error } = await supabaseClient.rpc('alterar_suspensao', {
                p_id: id,
                p_acao: acao,
                p_motivo: motivo || null
            });
            if (error) throw error;

            const linha = (data || [])[0];
            if (linha && linha.situacao === 'suspenso') {
                mostrarMensagem('Profissional suspenso. Ele saiu do diretório e o motivo ficou no histórico.', 'sucesso');
            } else if (linha && linha.situacao === 'aprovado') {
                mostrarMensagem('Profissional reativado. Ele voltou ao diretório.', 'sucesso');
            } else {
                mostrarMensagem(`Nada foi alterado: ${(linha && linha.detalhe) || 'o cadastro mudou'}. A tela foi atualizada.`, 'aviso');
            }
            el('motivo-suspensao').value = '';
            el('motivo-reativacao').value = '';
            atualizarContadorSuspensao();
            await carregar(true);
        } catch (falha) {
            console.error('Erro ao alterar a suspensão:', falha);
            mostrarMensagem(adm.traduzirErro(falha), 'erro');
        } finally {
            definirDecidindo(false);
        }
    }

    function atualizarContadorSuspensao() {
        el('contador-suspensao').textContent = `${el('motivo-suspensao').value.trim().length}/${MOTIVO_MAX}`;
    }

    function erroSuspensao(textoErro) {
        const erro = el('erro-suspensao');
        erro.textContent = textoErro || '';
        erro.hidden = !textoErro;
        if (textoErro) el('motivo-suspensao').setAttribute('aria-invalid', 'true');
        else el('motivo-suspensao').removeAttribute('aria-invalid');
    }

    el('form-suspensao').addEventListener('submit', (evento) => {
        evento.preventDefault();
        const motivo = el('motivo-suspensao').value.trim();
        if (motivo.length < MOTIVO_MIN || motivo.length > MOTIVO_MAX) {
            erroSuspensao(`Explique o motivo da suspensão com ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres.`);
            el('motivo-suspensao').focus();
            return;
        }
        erroSuspensao('');
        alterarSuspensao('suspender', motivo);
    });

    el('form-reativacao').addEventListener('submit', (evento) => {
        evento.preventDefault();
        alterarSuspensao('reativar', el('motivo-reativacao').value.trim());
    });

    el('motivo-suspensao').addEventListener('input', atualizarContadorSuspensao);

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

    ajustarOrigem();
    carregar();
})();
