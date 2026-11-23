// SITUAÇÃO DO CADASTRO (bloqueio.js) — US-006
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// - Visitante: exigirSessao manda para o login (com ?voltar=bloqueio.html).
// - Cliente: exigirSessao manda para a home.
// - Profissional: a mesma regra do login (calcularDestino) decide. Se o destino não for
//   esta página (aprovado ou perfil incompleto), redireciona; senão mostra pendente/recusado/suspenso.
// - Suspenso (US-019): mostra o motivo e a data de rpc('minha_ultima_decisao'). Se a leitura falhar,
//   o painel aparece sem o motivo (nunca trava a tela).

(function () {
    'use strict';

    const carregando = document.getElementById('bloqueio-carregando');
    const erro = document.getElementById('bloqueio-erro');
    const painelPendente = document.getElementById('painel-pendente');
    const painelRecusado = document.getElementById('painel-recusado');
    const painelSuspenso = document.getElementById('painel-suspenso');

    async function mostrarMotivoSuspensao() {
        const caixa = document.getElementById('suspenso-motivo-caixa');
        caixa.hidden = true;
        try {
            const { data, error } = await supabaseClient.rpc('minha_ultima_decisao');
            if (error) throw error;
            if (!data || data.acao !== 'suspensao' || !data.motivo) return;
            document.getElementById('suspenso-motivo').textContent = data.motivo;
            const quando = data.em ? new Date(data.em) : null;
            document.getElementById('suspenso-data').textContent =
                quando && !Number.isNaN(quando.getTime()) ? ` em ${quando.toLocaleDateString('pt-BR')}` : '';
            caixa.hidden = false;
        } catch (falha) {
            console.warn('Motivo da suspensão indisponível:', falha);
        }
    }

    async function verificar() {
        carregando.hidden = false;
        erro.hidden = true;
        painelPendente.hidden = true;
        painelRecusado.hidden = true;
        painelSuspenso.hidden = true;

        try {
            const sessao = await exigirSessao('profissional');
            if (!sessao) return; // já redirecionou

            const situacao = await buscarSituacaoProfissional(sessao.user.id);
            // null no voltar: aqui não há página de retorno, só a regra de status.
            const destino = calcularDestino({ tipo: 'profissional', status: situacao.status, totalCategorias: situacao.totalCategorias }, null);

            if (destino !== PAGINA_BLOQUEIO) {
                window.location.replace(destino);
                return;
            }

            carregando.hidden = true;
            if (situacao.status === 'recusado') {
                painelRecusado.hidden = false;
            } else if (situacao.status === 'suspenso') {
                await mostrarMotivoSuspensao();
                painelSuspenso.hidden = false;
            } else {
                painelPendente.hidden = false;
            }
        } catch (falha) {
            console.error('Erro ao verificar o cadastro:', falha);
            carregando.hidden = true;
            erro.hidden = false;
        }
    }

    document.getElementById('btn-recarregar').addEventListener('click', verificar);
    document.getElementById('btn-sair').addEventListener('click', sair);

    verificar();
})();
