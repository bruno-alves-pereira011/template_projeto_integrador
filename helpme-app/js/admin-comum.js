// UTILITÁRIOS DA ÁREA ADMIN (admin-comum.js) — US-015
// Usado por admin-analise.js e admin-profissional.js. Sem Supabase nem DOM próprio.
// Global criada aqui (NÃO redeclarar): window.HelpMeAdmin.

(function () {
    'use strict';

    // Resultado da triagem (BR12). null = ainda sem triagem (US-016 não rodou para este cadastro).
    const TRIAGEM = {
        verde: { texto: 'Verde', classe: 'triagem-verde' },
        pendencia: { texto: 'Pendência', classe: 'triagem-pendencia' },
        suspeito: { texto: 'Suspeito', classe: 'triagem-suspeito' },
        sem: { texto: 'Sem triagem', classe: 'triagem-sem' }
    };

    const ACOES = {
        triagem: 'Triagem automática',
        aprovacao: 'Aprovado',
        recusa: 'Recusado',
        reenvio: 'Reenviado para análise'
    };

    const STATUS = {
        pendente: 'Pendente',
        aprovado: 'Aprovado',
        recusado: 'Recusado'
    };

    function triagem(resultado) {
        return TRIAGEM[resultado] || TRIAGEM.sem;
    }

    // "há 5 min", "há 3 h", "há 2 dias" (tempo na fila, FR17).
    function tempoDesde(iso, agora) {
        const inicio = new Date(iso).getTime();
        if (!iso || Number.isNaN(inicio)) return '';
        const minutos = Math.max(0, Math.floor(((agora || Date.now()) - inicio) / 60000));
        if (minutos < 60) return minutos <= 1 ? 'há 1 min' : `há ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `há ${horas} h`;
        const dias = Math.floor(horas / 24);
        return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
    }

    function formatarData(iso) {
        const data = new Date(iso);
        if (!iso || Number.isNaN(data.getTime())) return '';
        return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    // Erros das funções do banco -> texto claro. Detalhe técnico fica no console.
    function traduzirErro(erro) {
        const codigo = (erro && erro.code) || '';
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (codigo === '42501') {
            return 'Sua conta não tem permissão de administrador para esta ação.';
        }
        if (codigo === '22023') {
            // Mensagens de validação escritas em português na 004 (motivo, seleção vazia...).
            return erro.message;
        }
        if (codigo === 'PGRST202') {
            return 'A área de análise ainda não foi instalada no banco (migration 004).';
        }
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
        }
        if (texto.includes('jwt')) {
            return 'Sua sessão expirou. Entre de novo.';
        }
        return 'Não foi possível concluir agora. Tente novamente em instantes.';
    }

    // "(11) 97777-0003" a partir de qualquer grafia (usa normalizarTelefone do telefone.js).
    // Número fora do padrão volta como veio, para o admin ver o que foi digitado.
    function formatarTelefone(numero) {
        const d = typeof normalizarTelefone === 'function' ? normalizarTelefone(numero) : null;
        if (!d) return numero ? String(numero) : '';
        const meio = d.length === 11 ? 7 : 6;
        return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
    }

    window.HelpMeAdmin = {
        triagem: triagem,
        rotuloAcao: (acao) => ACOES[acao] || acao,
        rotuloStatus: (status) => STATUS[status] || status,
        tempoDesde: tempoDesde,
        formatarData: formatarData,
        formatarTelefone: formatarTelefone,
        traduzirErro: traduzirErro
    };
})();
