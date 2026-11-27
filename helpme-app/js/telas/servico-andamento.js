// SERVIÇO EM ANDAMENTO (servico-andamento.js) — US-009 / FR13 (decisão D8)
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/servicos/supabase-config.js -> js/servicos/sessao.js -> js/servicos/telefone.js
//                           -> js/servicos/contratacao-comum.js.
// Fluxo:
//   1. exigirSessao() + ?id=. Não é parte (ou não existe): "não encontrada".
//   2. Só 'aceita' e 'concluida' ficam aqui; os outros status vão para a tela certa.
//   3. Contato da outra parte pela função contato_contraparte (BR07) -> botões Ligar/WhatsApp.
//   4. 'aceita': qualquer parte conclui (update condicionado a status = 'aceita'), mas só com valor
//      aprovado (US-023, BR23). Sem valor aprovado, o cliente pode cancelar. Depois, sem ações.
//      Quem decide é o trigger validar_contratacao (016); a tela só esconde o que não cabe.
//   5. Realtime: se a outra parte concluir ou cancelar, a tela atualiza sozinha.
//   6. Orçamento (US-022): o profissional envia o valor; o cliente aprova ou recusa. Quem pode fazer o quê
//      é o banco (enviar_orcamento / responder_orcamento); aqui só mostramos o que cabe a cada papel.
//      Realtime dos orçamentos: a outra parte vê o envio e a resposta sem recarregar.
//   7. Avaliação (US-025): na 'concluida', só o cliente vê o bloco; avalia (nota 1-5 + comentário opcional)
//      e depois edita. Quem pode é o banco (018, BR27/BR28); "#avaliacao" na URL rola até o bloco.

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    const idContratacao = lerIdContratacaoDaUrl();
    let uid = null;
    let consultaAtual = 0;
    let assinada = false;
    let orcamentoAguardando = null;   // o orçamento que o cliente pode responder agora
    let ocupado = false;              // trava contra duplo clique em enviar/aprovar/recusar/concluir/cancelar/avaliar
    let contratacaoAtual = null;      // a última lida (o profissional dela é quem é avaliado)
    let minhaAvaliacao = null;        // a avaliação do cliente para este profissional, ou null
    let editandoAvaliacao = false;    // formulário aberto por "Editar avaliação"
    let rolouParaAvaliacao = false;   // "#avaliacao" na URL: rola uma vez só
    const FALHA_AVALIACAO = { falhou: true }; // a leitura da avaliação falhou (só o bloco avisa)

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

        el('link-chat').href = linkDoChat(c.id);
        el('link-chat').textContent = c.status === 'aceita' ? 'Abrir conversa' : 'Ver conversa';
    }

    // Situação e ações da contratação (US-023): concluir só com valor aprovado; o cliente cancela antes.
    function preencherAcoes(c, papel, lista) {
        const aceita = c.status === 'aceita';
        const aprovado = lista.some((o) => o.situacao === 'aprovado');

        let situacao;
        if (!aceita) situacao = `Serviço concluído em ${new Date(c.updated_at).toLocaleDateString('pt-BR')}.`;
        else if (aprovado) situacao = 'Valor aprovado. Marque como concluído quando o serviço terminar.';
        else situacao = 'Contratação aceita. Combinem o valor no orçamento abaixo antes de concluir.';
        el('servico-situacao').textContent = situacao;

        el('btn-concluir').hidden = !(aceita && aprovado);
        el('concluir-bloqueado').hidden = !(aceita && !aprovado);
        el('btn-cancelar-contratacao').hidden = !(aceita && !aprovado && papel === 'cliente');
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
        el('btn-concluir').disabled = valor;
        el('btn-cancelar-contratacao').disabled = valor;
        el('btn-enviar-avaliacao').disabled = valor;
        el('btn-editar-avaliacao').disabled = valor;
    }

    // ---------- Avaliação (US-025) ----------

    // Mostra o resumo (já avaliou) ou o formulário (ainda não avaliou, ou editando). Não mexe no que a
    // pessoa está digitando: o Realtime da contratação chama carregar() de novo a qualquer momento.
    function preencherAvaliacao(c, papel, avaliacao, nomeProfissional) {
        const mostrar = papel === 'cliente' && c.status === 'concluida';
        el('avaliacao').hidden = !mostrar;
        if (!mostrar) return;

        // Sem saber se já avaliou, nem formulário nem resumo: enviar daria duplicada ou editaria às cegas.
        if (avaliacao === FALHA_AVALIACAO) {
            el('avaliacao-titulo').textContent = 'Avaliar profissional';
            el('avaliacao-situacao').textContent = 'Não foi possível carregar sua avaliação. Verifique sua conexão e recarregue a página.';
            el('avaliacao-resumo').hidden = true;
            el('form-avaliacao').hidden = true;
            return;
        }

        minhaAvaliacao = avaliacao;
        if (!avaliacao) editandoAvaliacao = false;
        const comFormulario = !avaliacao || editandoAvaliacao;

        el('avaliacao-titulo').textContent = avaliacao ? 'Sua avaliação' : 'Avaliar profissional';
        if (!avaliacao) {
            el('avaliacao-situacao').textContent =
                `Como foi o serviço de ${nomeProfissional || 'o profissional'}? Sua nota ajuda outros clientes a escolher.`;
        } else {
            el('avaliacao-situacao').textContent = editandoAvaliacao
                ? 'Troque a nota ou o comentário e salve.'
                : 'Obrigado por avaliar. Você pode editar quando quiser.';
        }

        el('avaliacao-resumo').hidden = comFormulario;
        if (avaliacao) {
            const estrelas = document.createElement('span');
            estrelas.setAttribute('aria-hidden', 'true');
            estrelas.className = 'estrelas-avaliacao';
            estrelas.textContent = '★'.repeat(avaliacao.nota) + '☆'.repeat(5 - avaliacao.nota);
            el('avaliacao-nota-texto').replaceChildren(estrelas, document.createTextNode(` Sua nota: ${avaliacao.nota} de 5`));
            el('avaliacao-comentario-texto').textContent = avaliacao.comentario || '';
            el('avaliacao-comentario-texto').hidden = !avaliacao.comentario;
        }

        el('form-avaliacao').hidden = !comFormulario;
        el('btn-enviar-avaliacao').textContent = avaliacao ? 'Salvar alterações' : 'Enviar avaliação';
        el('btn-cancelar-edicao').hidden = !avaliacao;

        if (!rolouParaAvaliacao && window.location.hash === '#avaliacao') {
            rolouParaAvaliacao = true;
            el('avaliacao').scrollIntoView({ block: 'start' });
            el('avaliacao-titulo').focus({ preventScroll: true });
        }
    }

    function notaEscolhida() {
        const marcada = document.querySelector('input[name="avaliacao-nota"]:checked');
        return marcada ? Number(marcada.value) : null;
    }

    function mostrarErroNota(texto) {
        el('erro-avaliacao-nota').textContent = texto || '';
        el('erro-avaliacao-nota').hidden = !texto;
        if (texto) el('avaliacao-notas').setAttribute('aria-invalid', 'true');
        else el('avaliacao-notas').removeAttribute('aria-invalid');
    }

    function atualizarContadorAvaliacao() {
        el('avaliacao-contador').textContent =
            `${el('avaliacao-comentario').value.length} de ${COMENTARIO_AVALIACAO_MAXIMO} caracteres.`;
    }

    // "Editar avaliação": abre o formulário com a nota e o comentário atuais.
    function abrirEdicao() {
        if (!minhaAvaliacao || ocupado) return;
        editandoAvaliacao = true;
        el('form-avaliacao').reset();
        const radio = document.querySelector(`input[name="avaliacao-nota"][value="${minhaAvaliacao.nota}"]`);
        if (radio) radio.checked = true;
        el('avaliacao-comentario').value = minhaAvaliacao.comentario || '';
        atualizarContadorAvaliacao();
        mostrarErroNota('');
        preencherAvaliacao(contratacaoAtual, 'cliente', minhaAvaliacao, '');
        (radio || el('avaliacao-comentario')).focus();
    }

    function cancelarEdicao() {
        editandoAvaliacao = false;
        mostrarErroNota('');
        preencherAvaliacao(contratacaoAtual, 'cliente', minhaAvaliacao, '');
        el('btn-editar-avaliacao').focus();
    }

    async function enviarAvaliacao(evento) {
        evento.preventDefault();
        if (ocupado || !contratacaoAtual) return;

        mostrarAviso('');
        const nota = notaEscolhida();
        if (!nota) {
            mostrarErroNota('Escolha uma nota de 1 a 5.');
            document.querySelector('input[name="avaliacao-nota"]').focus();
            return;
        }
        const comentario = el('avaliacao-comentario').value.trim();
        if (comentario.length > COMENTARIO_AVALIACAO_MAXIMO) {
            mostrarAviso(`O comentário pode ter até ${COMENTARIO_AVALIACAO_MAXIMO} caracteres.`);
            el('avaliacao-comentario').focus();
            return;
        }
        mostrarErroNota('');

        const editando = Boolean(minhaAvaliacao);
        definirOcupado(true);
        try {
            minhaAvaliacao = await salvarAvaliacao({
                idAvaliacao: editando ? minhaAvaliacao.id : null,
                uid: uid,
                profissionalId: contratacaoAtual.profissional_id,
                nota: nota,
                comentario: comentario
            });
            editandoAvaliacao = false;
            el('form-avaliacao').reset();
            atualizarContadorAvaliacao();
            mostrarAviso(editando ? 'Avaliação atualizada.' : 'Avaliação enviada. Obrigado!');
        } catch (falha) {
            console.error('Erro ao salvar a avaliação:', falha);
            // Já existia (outra aba) ou sumiu: a releitura mostra o que está no banco.
            if (falha && (falha.code === '23505' || falha.code === 'SEM_LINHA')) editandoAvaliacao = false;
            mostrarAviso(traduzirErroAvaliacao(falha));
        } finally {
            definirOcupado(false);
        }
        el('servico-aviso').focus();
        await carregar();
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

    // A avaliação vem DEPOIS de a contratação aparecer: se a leitura dela demorar ou falhar (o supabase-js
    // tenta de novo sozinho por alguns segundos), só o bloco de avaliação espera ou avisa.
    async function carregarAvaliacao(c, papel, minhaConsulta) {
        if (!(papel === 'cliente' && c.status === 'concluida')) {
            preencherAvaliacao(c, papel, null, '');
            return;
        }

        if (el('avaliacao').hidden) {   // primeira vez: o bloco aparece já dizendo que está carregando
            el('avaliacao').hidden = false;
            el('avaliacao-situacao').textContent = 'Carregando sua avaliação...';
            el('avaliacao-resumo').hidden = true;
            el('form-avaliacao').hidden = true;
        }

        let avaliacao;
        try {
            avaliacao = await buscarMinhaAvaliacao(uid, c.profissional_id);
        } catch (falha) {
            console.error('Erro ao ler a avaliação (o resto da tela continua):', falha);
            avaliacao = FALHA_AVALIACAO;
        }
        if (minhaConsulta !== consultaAtual) return;

        // Depois de a contratação aparecer: o "#avaliacao" da URL só rola com o bloco já visível.
        preencherAvaliacao(c, papel, avaliacao, el('detalhe-outra-parte').textContent);
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

            contratacaoAtual = c;
            preencher(c, papel, contato);
            preencherAcoes(c, papel, orcamentos);
            preencherOrcamento(c, papel, orcamentos);
            mostrarEstado('detalhe');

            if (!assinada) {
                assinada = true;
                assinarContratacao(c.id, () => carregar());
                assinarOrcamentos(c.id, () => carregar());
            }

            await carregarAvaliacao(c, papel, minhaConsulta);
        } catch (falha) {
            if (minhaConsulta !== consultaAtual) return;
            console.error('Erro ao carregar a contratação:', falha);
            mostrarEstado('erro');
        }
    }

    async function concluir() {
        if (ocupado) return;
        if (!window.confirm('Marcar este serviço como concluído? Depois disso não dá para desfazer.')) return;

        definirOcupado(true);
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(idContratacao, 'aceita', 'concluida');
            mostrarAviso(mudou ? 'Serviço marcado como concluído.' : 'Esta contratação já tinha mudado. A tela foi atualizada.');
        } catch (falha) {
            // Ex.: o valor ainda não estava aprovado (BR23) — o banco explica em português.
            console.error('Erro ao concluir:', falha);
            mostrarAviso(traduzirErroContratacao(falha, 'Não foi possível concluir agora. Tente novamente.'));
        } finally {
            definirOcupado(false);
        }

        el('servico-aviso').focus();
        await carregar();
    }

    // Cliente cancela a contratação aceita enquanto não aprovou o valor (FR31). Depois de cancelada,
    // carregar() leva o cliente para espera-cliente.html (desfecho) e o profissional para a lista.
    async function cancelarContratacao() {
        if (ocupado) return;
        if (!window.confirm('Cancelar esta contratação? O profissional verá que ela foi cancelada por você.')) return;

        definirOcupado(true);
        mostrarAviso('');

        try {
            const mudou = await mudarStatusContratacao(idContratacao, 'aceita', 'cancelada');
            if (!mudou) mostrarAviso('Esta contratação já tinha mudado. A tela foi atualizada.');
        } catch (falha) {
            // Ex.: o valor foi aprovado em outra aba (BR23).
            console.error('Erro ao cancelar:', falha);
            mostrarAviso(traduzirErroContratacao(falha, 'Não foi possível cancelar agora. Tente novamente.'));
        } finally {
            definirOcupado(false);
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
    el('btn-cancelar-contratacao').addEventListener('click', cancelarContratacao);
    el('form-orcamento').addEventListener('submit', enviarValor);
    el('orcamento-valor').addEventListener('input', () => mostrarErroValor(''));
    el('orcamento-obs').addEventListener('input', atualizarContador);
    el('btn-aprovar-orcamento').addEventListener('click', () => responder(true));
    el('btn-recusar-orcamento').addEventListener('click', () => responder(false));
    el('form-avaliacao').addEventListener('submit', enviarAvaliacao);
    el('avaliacao-comentario').addEventListener('input', atualizarContadorAvaliacao);
    document.querySelectorAll('input[name="avaliacao-nota"]').forEach((r) => r.addEventListener('change', () => mostrarErroNota('')));
    el('btn-editar-avaliacao').addEventListener('click', abrirEdicao);
    el('btn-cancelar-edicao').addEventListener('click', cancelarEdicao);
    el('btn-tentar-novamente').addEventListener('click', () => (uid ? carregar() : iniciar()));

    iniciar();
})();
