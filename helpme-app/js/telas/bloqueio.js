// SITUAÇÃO DO CADASTRO (bloqueio.js) — US-006, US-013, US-019
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/servicos/supabase-config.js -> js/servicos/sessao.js.
// - Visitante: exigirSessao manda para o login (com ?voltar=bloqueio.html).
// - Cliente: exigirSessao manda para a home.
// - Profissional: a mesma regra do login (calcularDestino) decide. Se o destino não for
//   esta página (aprovado ou perfil incompleto), redireciona; senão mostra pendente/recusado/suspenso.
// - Motivo da recusa (US-013) e da suspensão (US-019): rpc('minha_ultima_decisao').
// - Pendências da última triagem (US-013): rpc('minhas_pendencias'), no pendente e no recusado.
//   Sinais de suspeita nunca vêm do banco para cá.
// - Reenvio (US-013, BR17): rpc('reenviar_para_analise'); o status volta a 'pendente' e a tela
//   recarrega no painel "em análise". O profissional continua nesta página.
// Se a leitura do motivo ou das pendências falhar, o painel aparece sem eles (nunca trava a tela).
// Textos do banco entram só com textContent.

(function () {
    'use strict';

    const carregando = document.getElementById('bloqueio-carregando');
    const erro = document.getElementById('bloqueio-erro');
    const painelPendente = document.getElementById('painel-pendente');
    const painelRecusado = document.getElementById('painel-recusado');
    const painelSuspenso = document.getElementById('painel-suspenso');
    const avisoReenviado = document.getElementById('pendente-reenviado');
    const linkPerfilPendente = document.getElementById('link-perfil-pendente');
    const erroReenvio = document.getElementById('reenvio-erro');
    const btnReenviar = document.getElementById('btn-reenviar');

    function dataCurta(valor) {
        const quando = valor ? new Date(valor) : null;
        return quando && !Number.isNaN(quando.getTime()) ? ` em ${quando.toLocaleDateString('pt-BR')}` : '';
    }

    // acao: 'recusa' | 'suspensao'; prefixo dos ids: 'recusado' | 'suspenso'.
    async function mostrarMotivo(acao, prefixo) {
        const caixa = document.getElementById(prefixo + '-motivo-caixa');
        caixa.hidden = true;
        try {
            const { data, error } = await supabaseClient.rpc('minha_ultima_decisao');
            if (error) throw error;
            if (!data || data.acao !== acao || !data.motivo) return;
            document.getElementById(prefixo + '-motivo').textContent = data.motivo;
            document.getElementById(prefixo + '-data').textContent = dataCurta(data.em);
            caixa.hidden = false;
        } catch (falha) {
            console.warn('Motivo da decisão indisponível:', falha);
        }
    }

    // Devolve quantas pendências foram mostradas (0 se nenhuma ou se a leitura falhou).
    async function mostrarPendencias(prefixo) {
        const caixa = document.getElementById(prefixo + '-pendencias-caixa');
        const lista = document.getElementById(prefixo + '-pendencias');
        caixa.hidden = true;
        lista.replaceChildren();
        try {
            const { data, error } = await supabaseClient.rpc('minhas_pendencias');
            if (error) throw error;
            const pendencias = Array.isArray(data) ? data.filter((texto) => typeof texto === 'string' && texto) : [];
            pendencias.forEach((texto) => {
                const item = document.createElement('li');
                item.textContent = texto;
                lista.appendChild(item);
            });
            caixa.hidden = pendencias.length === 0;
            return pendencias.length;
        } catch (falha) {
            console.warn('Pendências indisponíveis:', falha);
            return 0;
        }
    }

    function traduzirErroReenvio(falha) {
        const texto = ((falha && falha.message) || '').toLowerCase();
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
        }
        if ((falha && falha.code === '22023') || texto.includes('só um cadastro recusado')) {
            return 'Seu cadastro já não está recusado. A página foi atualizada com a situação atual.';
        }
        if ((falha && falha.code === '42501') || texto.includes('permission denied')) {
            return 'Você não tem permissão para reenviar este cadastro. Saia e entre de novo.';
        }
        return 'Não foi possível reenviar agora. Tente novamente em alguns instantes.';
    }

    // opcoes.reenviado: mostra a confirmação no painel "em análise" (logo depois do reenvio).
    async function verificar(opcoes) {
        const reenviado = Boolean(opcoes && opcoes.reenviado);
        carregando.hidden = false;
        erro.hidden = true;
        painelPendente.hidden = true;
        painelRecusado.hidden = true;
        painelSuspenso.hidden = true;
        avisoReenviado.hidden = true;
        erroReenvio.hidden = true;   // um erro antigo não sobrevive a "Tentar novamente"

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

            if (situacao.status === 'recusado') {
                await Promise.all([mostrarMotivo('recusa', 'recusado'), mostrarPendencias('recusado')]);
                carregando.hidden = true;
                painelRecusado.hidden = false;
            } else if (situacao.status === 'suspenso') {
                await mostrarMotivo('suspensao', 'suspenso');
                carregando.hidden = true;
                painelSuspenso.hidden = false;
            } else {
                const total = await mostrarPendencias('pendente');
                linkPerfilPendente.textContent = total ? 'Corrigir meu perfil' : 'Editar meu perfil';
                carregando.hidden = true;
                painelPendente.hidden = false;
                if (reenviado) {
                    avisoReenviado.hidden = false;
                    avisoReenviado.focus();
                }
            }
        } catch (falha) {
            console.error('Erro ao verificar o cadastro:', falha);
            carregando.hidden = true;
            erro.hidden = false;
        }
    }

    async function reenviar() {
        erroReenvio.hidden = true;
        btnReenviar.disabled = true;
        btnReenviar.textContent = 'Reenviando...';
        try {
            const { error } = await supabaseClient.rpc('reenviar_para_analise');
            if (error) throw error;
            await verificar({ reenviado: true });
        } catch (falha) {
            console.error('Erro ao reenviar para análise:', falha);
            const mensagem = traduzirErroReenvio(falha);
            if (falha && falha.code === '22023') {
                // O status mudou por outro caminho (ex.: o admin decidiu): mostra a situação real.
                await verificar();
            }
            if (!painelRecusado.hidden) {
                erroReenvio.textContent = mensagem;
                erroReenvio.hidden = false;
                erroReenvio.focus();
            }
        } finally {
            btnReenviar.disabled = false;
            btnReenviar.textContent = 'Reenviar para análise';
        }
    }

    document.getElementById('btn-recarregar').addEventListener('click', () => verificar());
    document.getElementById('btn-sair').addEventListener('click', sair);
    btnReenviar.addEventListener('click', reenviar);

    verificar();
})();
