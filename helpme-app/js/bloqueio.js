// SITUAÇÃO DO CADASTRO (bloqueio.js) — US-006
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// - Visitante: exigirSessao manda para o login (com ?voltar=bloqueio.html).
// - Cliente: exigirSessao manda para a home.
// - Profissional: a mesma regra do login (calcularDestino) decide. Se o destino não for
//   esta página (aprovado ou perfil incompleto), redireciona; senão mostra pendente/recusado.

(function () {
    'use strict';

    const carregando = document.getElementById('bloqueio-carregando');
    const erro = document.getElementById('bloqueio-erro');
    const painelPendente = document.getElementById('painel-pendente');
    const painelRecusado = document.getElementById('painel-recusado');

    async function verificar() {
        carregando.hidden = false;
        erro.hidden = true;
        painelPendente.hidden = true;
        painelRecusado.hidden = true;

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
