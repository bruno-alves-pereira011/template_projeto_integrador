// SERVIÇO EM ANDAMENTO (servico-andamento.js) — US-009 / FR13 (decisão D8)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/servicos/supabase-config.js -> js/servicos/sessao.js -> js/servicos/telefone.js
//                           -> js/servicos/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao() + ?id=. Não é parte (ou não existe): "não encontrada".
//   2. Só 'aceita' e 'concluida' ficam aqui; os outros status vão para a tela certa.
//   3. Contato da outra parte pela função contato_contraparte (BR07) -> botões Ligar/WhatsApp.
//   4. 'aceita': qualquer parte conclui (update condicionado a status = 'aceita'). Depois, sem ações.
//   5. Realtime: se a outra parte concluir, a tela atualiza sozinha.
//   6. Orçamento (US-022): o profissional envia o valor; o cliente aprova ou recusa. Quem pode fazer o quê
//      é o banco (enviar_orcamento / responder_orcamento); aqui só mostramos o que cabe a cada papel.
//      Realtime dos orçamentos: a outra parte vê o envio e a resposta sem recarregar.

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    const idContratacao = lerIdContratacaoDaUrl();
    let uid = null;
    let consultaAtual = 0;
    let assinada = false;
    let orcamentoAguardando = null;   // o orçamento que o cliente pode responder agora
    let ocupado = false;              // trava contra duplo clique em enviar/aprovar/recusar

    function mostrarEstado(estado) {
        el('servico-carregando').hidden = estado !== 'carregando';
        el('servico-erro').hidden = estado !== 'erro';
        el('servico-nao-encontrada').hidden = estado !== 'nao-encontrada';
        el('servico-detalhe').hidden = estado !== 'detalhe';
    }

    function mostrarAviso(texto) {
        el('servico-aviso').textContent = texto || '';
        el('servico-aviso').hidden = !texto;
    }

    // Botões de contato. O cliente não tem WhatsApp próprio no modelo: para ele, o telefone serve
    // para os dois botões (mesma regra comentada em contato_contraparte, 001_schema.sql).
    function preencherContato(contato, papel) {
        const nome = (contato && contato.nome) || (papel === 'cliente' ? 'Profissional' : 'Cliente');
        const telefone = contato && contato.telefone;
        const whatsapp = contato && (contato.whatsapp || (papel === 'profissional' ? contato.telefone : null));

        const hrefTel = linkTel(telefone);
        const hrefWhatsApp = linkWhatsApp(whatsapp);

        const ligar = el('btn-ligar');
        const zap = el('btn-whatsapp');

        if (hrefTel) {
            ligar.href = hrefTel;
            ligar.setAttribute('aria-label', `Ligar para ${nome}`);
        } else {
            ligar.removeAttribute('href');
        }
        ligar.hidden = !hrefTel;

        if (hrefWhatsApp) {
            zap.href = hrefWhatsApp;
            zap.setAttribute('aria-label', `Conversar com ${nome} no WhatsApp (abre em nova aba)`);
        } else {
            zap.removeAttribute('href');
        }
        zap.hidden = !hrefWhatsApp;

        const indisponivel = el('contato-indisponivel');
        indisponivel.hidden = Boolean(hrefTel || hrefWhatsApp);
        indisponivel.textContent = papel === 'cliente'
            ? 'O profissional não cadastrou um telefone válido.'
            : 'O cliente não cadastrou telefone.';

        return nome;
    }

    function preencher(c, papel, contato) {
        el('rotulo-outra-parte').textContent = papel === 'cliente' ? 'Profissional' : 'Cliente';
        el('detalhe-outra-parte').textContent = preencherContato(contato, papel);

        const selo = el('detalhe-status');
        selo.textContent = rotuloStatusContratacao(c.status, papel);
        selo.className = 'badge-status status-' + c.status;

        el('detalhe-data').textContent = textoDataContratacao(c.data_desejada);
        el('detalhe-descricao').textContent = c.descricao;
        el('detalhe-endereco').textContent = c.endereco;

        el('servico-situacao').textContent = c.status === 'concluida'
            ? `Serviço concluído em ${new Date(c.updated_at).toLocaleDateString('pt-BR')}.`
            : 'Contratação aceita. Combine os detalhes e marque como concluído quando o serviço terminar.';

        el('btn-concluir').hidden = c.status !== 'aceita';
        el('btn-concluir').disabled = false;

        el('link-chat').href = linkDoChat(c.id);
        el('link-chat').textContent = c.status === 'aceita' ? 'Abrir conversa' : 'Ver conversa';
    }

    // ---------- Orçamento (US-022) ----------

    function dataCurta(iso) {
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function textoHistorico(o) {
        const resposta = {
            aprovado: `aprovado em ${o.respondido_em ? dataCurta(o.respondido_em) : ''}`,
            recusado: `recusado em ${o.respondido_em ? dataCurta(o.respondido_em) : ''}`,
            aguardando: 'aguardando resposta'
        };
        return `${formatarReais(o.valor_centavos)}, enviado em ${dataCurta(o.created_at)}, ${resposta[o.situacao] || o.situacao}`
            + (o.observacao ? `. Incluso: ${o.observacao}` : '');
    }

    // Mostra o bloco conforme a situação e o papel. `lista` vem do mais antigo para o mais novo.
    function preencherOrcamento(c, papel, lista) {
        const aceita = c.status === 'aceita';
        const aprovado = lista.find((o) => o.situacao === 'aprovado') || null;
        const aguardando = lista.find((o) => o.situacao === 'aguardando') || null;
        const ultimo = lista.length ? lista[lista.length - 1] : null;
        orcamentoAguardando = aceita && papel === 'cliente' ? aguardando : null;

        // Contratação concluída antes do orçamento existir: não há o que mostrar.
        el('orcamento').hidden = !aceita && !lista.length;
        if (el('orcamento').hidden) return;

        let texto;
        if (aprovado) {
            texto = `Valor aprovado: ${formatarReais(aprovado.valor_centavos)}`;
        } else if (!aceita) {
            texto = 'Nenhum valor foi aprovado nesta contratação.';
        } else if (aguardando) {
            texto = papel === 'cliente'
                ? `Valor proposto: ${formatarReais(aguardando.valor_centavos)}`
                : `Aguardando o cliente responder: ${formatarReais(aguardando.valor_centavos)}`;
        } else if (ultimo && ultimo.situacao === 'recusado') {
            texto = papel === 'cliente'
                ? `Você recusou ${formatarReais(ultimo.valor_centavos)}. Aguardando um novo valor do profissional.`
                : `O cliente recusou ${formatarReais(ultimo.valor_centavos)}. Envie um novo valor.`;
        } else {
            texto = papel === 'cliente'
                ? 'Aguardando o profissional enviar o valor do serviço.'
                : 'Envie o valor do serviço para o cliente aprovar.';
        }
        el('orcamento-situacao').textContent = texto;

        const comObservacao = aprovado || aguardando;
        const observacao = comObservacao && comObservacao.observacao;
        el('orcamento-observacao').textContent = observacao ? `Incluso: ${observacao}` : '';
        el('orcamento-observacao').hidden = !observacao;

        el('orcamento-resposta').hidden = !orcamentoAguardando;
        el('form-orcamento').hidden = !(aceita && papel === 'profissional' && !aprovado && !aguardando);

        // Histórico só com mais de um valor ou alguma recusa (com um valor só, a frase acima já diz tudo).
        el('orcamento-lista').replaceChildren(...lista.map((o) => {
            const item = document.createElement('li');
            item.textContent = textoHistorico(o);
            return item;
        }));
        el('orcamento-historico').hidden = !(lista.length > 1 || lista.some((o) => o.situacao === 'recusado'));

        definirOcupado(ocupado);
    }

    function definirOcupado(valor) {
        ocupado = valor;
        el('btn-enviar-orcamento').disabled = valor;
        el('btn-aprovar-orcamento').disabled = valor;
        el('btn-recusar-orcamento').disabled = valor;
    }

    function mostrarErroValor(texto) {
        const erro = el('erro-orcamento-valor');
        erro.textContent = texto || '';
        erro.hidden = !texto;
        if (texto) el('orcamento-valor').setAttribute('aria-invalid', 'true');
        else el('orcamento-valor').removeAttribute('aria-invalid');
    }

    function atualizarContador() {
        el('orcamento-contador').textContent = `${el('orcamento-obs').value.length} de 200 caracteres.`;
    }

    async function enviarValor(evento) {
        evento.preventDefault();
        if (ocupado) return;

        mostrarAviso('');
        const centavos = lerValorEmCentavos(el('orcamento-valor').value);
        if (centavos === null) {
            mostrarErroValor('Informe o valor em reais, por exemplo 350,00.');
            el('orcamento-valor').focus();
            return;
        }
        if (centavos < VALOR_MINIMO_CENTAVOS || centavos > VALOR_MAXIMO_CENTAVOS) {
            mostrarErroValor('O valor precisa estar entre R$ 1,00 e R$ 100.000,00.');
            el('orcamento-valor').focus();
            return;
        }
        mostrarErroValor('');

        definirOcupado(true);
        try {
            await enviarOrcamento(idContratacao, centavos, el('orcamento-obs').value.trim());
            el('form-orcamento').reset();
            atualizarContador();
            mostrarAviso(`Orçamento de ${formatarReais(centavos)} enviado. O cliente vai ver o valor para aprovar.`);
        } catch (falha) {
            console.error('Erro ao enviar o orçamento:', falha);
            mostrarAviso(traduzirErroOrcamento(falha));
        } finally {
            definirOcupado(false);
        }
        el('servico-aviso').focus();
        await carregar();
    }

    async function responder(aprovar) {
        const alvo = orcamentoAguardando;
        if (ocupado || !alvo) return;

        const valor = formatarReais(alvo.valor_centavos);
        if (aprovar && !window.confirm(`Aprovar ${valor}? Depois de aprovado, o valor não muda.`)) return;

        definirOcupado(true);
        mostrarAviso('');
        try {
            await responderOrcamento(alvo.id, aprovar);
            mostrarAviso(aprovar
                ? `Valor de ${valor} aprovado.`
                : `Valor de ${valor} recusado. O profissional pode enviar outro.`);
        } catch (falha) {
            console.error('Erro ao responder o orçamento:', falha);
            mostrarAviso(traduzirErroOrcamento(falha));
        } finally {
            definirOcupado(false);
        }
        el('servico-aviso').focus();
        await carregar();
    }

    async function carregar() {
        const minhaConsulta = ++consultaAtual;

        try {
            const c = await buscarContratacao(idContratacao);
            if (minhaConsulta !== consultaAtual) return;

            if (!c) {
                mostrarEstado('nao-encontrada');
                return;
            }

            const papel = c.cliente_id === uid ? 'cliente' : 'profissional';

            // Antes do aceite (ou recusada/cancelada) a tela certa é outra.
            if (c.status !== 'aceita' && c.status !== 'concluida') {
                window.location.replace(papel === 'cliente' ? paginaDaContratacao(c) : PAGINA_CONTRATACOES);
                return;
            }

            const [contato, orcamentos] = await Promise.all([buscarContatoContraparte(c.id), buscarOrcamentos(c.id)]);
            if (minhaConsulta !== consultaAtual) return;

            preencher(c, papel, contato);
            preencherOrcamento(c, papel, orcamentos);
            mostrarEstado('detalhe');

            if (!assinada) {
                assinada = true;
                assinarContratacao(c.id, () => carregar());
                assinarOrcamentos(c.id, () => carregar());
            }
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar a contratação:', falha);
            mostrarEstado('erro');
        }
    }

    async function concluir() {
        if (!window.confirm('Marcar este serviço como concluído? Depois disso não dá para desfazer.')) return;

        el('btn-concluir').disabled = true;
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(idContratacao, 'aceita', 'concluida');
            mostrarAviso(mudou ? 'Serviço marcado como concluído.' : 'A outra parte já tinha concluído este serviço.');
        } catch (falha) {
            console.error('Erro ao concluir:', falha);
            const texto = ((falha && falha.message) || '').toLowerCase();
            mostrarAviso(texto.includes('failed to fetch') || texto.includes('network')
                ? 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
                : 'Não foi possível concluir agora. Tente novamente.');
        }

        el('servico-aviso').focus();
        await carregar();
    }

    async function iniciar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao();
            if (!sessao) return; // já redirecionou para o login
            uid = sessao.user.id;
            // "Voltar para o início" (DEBT-013): mesma regra do login; o profissional vai ao painel dele.
            document.getElementById('link-inicio').href = destinoDoPapel(sessao, null);
        } catch (falha) {
            console.error('Erro ao verificar a sessão:', falha);
            mostrarEstado('erro');
            return;
        }

        if (!idContratacao) {
            mostrarEstado('nao-encontrada');
            return;
        }

        await carregar();
    }

    el('btn-concluir').addEventListener('click', concluir);
    el('form-orcamento').addEventListener('submit', enviarValor);
    el('orcamento-valor').addEventListener('input', () => mostrarErroValor(''));
    el('orcamento-obs').addEventListener('input', atualizarContador);
    el('btn-aprovar-orcamento').addEventListener('click', () => responder(true));
    el('btn-recusar-orcamento').addEventListener('click', () => responder(false));
    el('btn-tentar-novamente').addEventListener('click', () => (uid ? carregar() : iniciar()));

    iniciar();
})();
