// CONTRATAÇÃO — FUNÇÕES COMUNS (contratacao-comum.js) — US-008 / US-009
// OBJETIVO: o que contratacoes.html, espera-cliente.html e servico-andamento.html fazem igual:
// ler uma contratação, ler o contato da outra parte, mudar o status, ouvir o Realtime, rótulos e datas.
// COMO USAR: script clássico, depois de js/servicos/supabase-config.js e antes do script da página.
// API PÚBLICA (globais): lerIdContratacaoDaUrl, buscarContratacao, buscarContatoContraparte,
//   mudarStatusContratacao, assinarContratacao, rotuloStatusContratacao, textoDataContratacao,
//   PAGINA_ESPERA_CLIENTE, PAGINA_SERVICO_ANDAMENTO, PAGINA_CONTRATACOES, PAGINA_CHAT,
//   paginaDaContratacao, linkDoChat.
//   Orçamento (US-022): VALOR_MINIMO_CENTAVOS, VALOR_MAXIMO_CENTAVOS, formatarReais, lerValorEmCentavos,
//   buscarOrcamentos, enviarOrcamento, responderOrcamento, assinarOrcamentos, traduzirErroOrcamento.
//   Concluir/cancelar (US-023): traduzirErroContratacao.
// SEGURANÇA: quem decide o que cada um lê e quais transições valem é o banco (RLS, trigger
// validar_contratacao e função contato_contraparte). Aqui só se consome.

// Telas da contratação (decisão D8: os nomes antigos foram mantidos)
const PAGINA_ESPERA_CLIENTE = 'espera-cliente.html';       // 'solicitada' (e o desfecho recusada/cancelada)
const PAGINA_SERVICO_ANDAMENTO = 'servico-andamento.html'; // 'aceita' e 'concluida'
const PAGINA_CONTRATACOES = 'contratacoes.html';           // listas do cliente e do profissional
const PAGINA_CHAT = 'contratacao.html';                    // conversa das partes, em qualquer status (D9)

// Colunas lidas em todas as telas
const COLUNAS_CONTRATACAO = 'id, cliente_id, profissional_id, descricao, endereco, data_desejada, status, created_at, updated_at';


// Tela de detalhe certa para o status: aceita/concluída -> serviço em andamento; o resto -> espera.
function paginaDaContratacao(contratacao) {
    const pagina = contratacao.status === 'aceita' || contratacao.status === 'concluida'
        ? PAGINA_SERVICO_ANDAMENTO
        : PAGINA_ESPERA_CLIENTE;
    return `${pagina}?id=${encodeURIComponent(contratacao.id)}`;
}


// Conversa da contratação (US-010).
function linkDoChat(id) {
    return `${PAGINA_CHAT}?id=${encodeURIComponent(id)}`;
}


// ?id= da URL, só se for um número inteiro positivo (id é bigint). Senão null.
function lerIdContratacaoDaUrl() {
    const valor = (new URLSearchParams(window.location.search).get('id') || '').trim();
    return /^[1-9]\d{0,17}$/.test(valor) ? valor : null;
}


// A linha da contratação, ou null se não existir OU se quem chama não for parte dela (o RLS esconde).
// Lança erro em falha de rede/banco.
async function buscarContratacao(id) {
    if (!supabaseClient) throw new Error('Cliente do Supabase indisponível.');

    const { data, error } = await supabaseClient
        .from('contratacoes')
        .select(COLUNAS_CONTRATACAO)
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}


// Contato da outra parte (BR07, função contato_contraparte no banco):
//   cliente vê nome, telefone e WhatsApp do profissional;
//   profissional vê só o primeiro nome do cliente até o aceite, e nome + telefone depois.
// Retorna { nome, telefone, whatsapp, contato_liberado } ou null.
async function buscarContatoContraparte(id) {
    const { data, error } = await supabaseClient.rpc('contato_contraparte', { p_contratacao_id: Number(id) });
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
}


// Muda o status SÓ se ainda estiver em `statusAtual` (evita sobrescrever a ação da outra parte).
// Retorna true se mudou, false se o status já era outro (ex.: o profissional aceitou antes do cancelamento).
// Lança erro se o banco recusar (trigger/RLS) ou em falha de rede.
async function mudarStatusContratacao(id, statusAtual, novoStatus) {
    const { data, error } = await supabaseClient
        .from('contratacoes')
        .update({ status: novoStatus })
        .eq('id', id)
        .eq('status', statusAtual)
        .select('id');

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
}


// Realtime de UMA contratação. O RLS garante que só as partes recebem o evento.
// `aoMudar` recebe a linha nova. Retorna o canal (para quem quiser cancelar).
function assinarContratacao(id, aoMudar) {
    return supabaseClient
        .channel('contratacao-' + id)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'contratacoes', filter: `id=eq.${id}` },
            (evento) => aoMudar(evento && evento.new))
        .subscribe();
}


// Mensagem para a tela quando o banco recusa concluir ou cancelar (BR23, migration 016).
// As regras novas do trigger falam português com 22023/42501 (texto fixo da migration, sem dado de
// ninguém): mostrado como veio. Rede vira texto fixo; o resto, `textoPadrao`.
function traduzirErroContratacao(falha, textoPadrao) {
    const codigo = falha && falha.code;
    const texto = ((falha && falha.message) || '').toLowerCase();

    // 42501 do RLS vem em inglês ("row-level security"): esse não vai para a tela.
    if ((codigo === '22023' || codigo === '42501') && falha.message && !texto.includes('row-level security')) {
        return falha.message;
    }
    if (texto.includes('failed to fetch') || texto.includes('network')) {
        return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    }
    return textoPadrao;
}


// Texto do selo de status para quem está vendo ('cliente' ou 'profissional').
// A classe CSS correspondente é status-<status> (contratacao.css).
function rotuloStatusContratacao(status, papel) {
    const rotulos = {
        solicitada: papel === 'cliente' ? 'Aguardando o profissional' : 'Aguardando resposta',
        aceita: 'Aceita',
        recusada: 'Recusada',
        cancelada: papel === 'cliente' ? 'Cancelada por você' : 'Cancelada pelo cliente',
        concluida: 'Concluída'
    };
    return rotulos[status] || status;
}


// "sex., 24/10 às 10:00" (horário local)
function textoDataContratacao(iso) {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return 'Data não informada';
    const dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} às ${hora}`;
}


// ==========================================
// ORÇAMENTO (US-022, migration 015)
// ==========================================
// O valor anda em CENTAVOS inteiros (NFR12): nada de ponto flutuante entre a tela e o banco.
// Quem decide quem envia e quem responde é o banco (enviar_orcamento / responder_orcamento).

const VALOR_MINIMO_CENTAVOS = 100;        // R$ 1,00 (BR26)
const VALOR_MAXIMO_CENTAVOS = 10000000;   // R$ 100.000,00 (BR26)

const FORMATO_REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 35050 -> "R$ 350,50"
function formatarReais(centavos) {
    return FORMATO_REAIS.format(Number(centavos) / 100);
}


// Lê o que a pessoa digitou e devolve centavos inteiros, ou null se não for um valor.
// Aceita "350", "350,5", "350,50", "1.234,56", "R$ 1.234,56" e "1234.56".
// Com vírgula, o ponto é separador de milhar; sem vírgula, "1.234" é milhar e "12.5" é decimal.
function lerValorEmCentavos(texto) {
    let valor = String(texto || '').replace(/R\$/gi, '').replace(/\s/g, '');
    if (!valor) return null;

    if (valor.includes(',')) {
        valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(valor)) {
        valor = valor.replace(/\./g, '');
    }

    if (!/^\d{1,9}(\.\d{1,2})?$/.test(valor)) return null;

    const [inteiro, decimal = ''] = valor.split('.');
    return Number(inteiro) * 100 + Number((decimal + '00').slice(0, 2));
}


// Orçamentos da contratação, do mais antigo para o mais novo. O RLS só devolve às partes.
async function buscarOrcamentos(idContratacao) {
    const { data, error } = await supabaseClient
        .from('orcamentos')
        .select('id, valor_centavos, observacao, situacao, created_at, respondido_em')
        .eq('contratacao_id', idContratacao)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
}


// Profissional envia um valor. Lança o erro do banco (22023 = regra; 42501 = não é a parte).
async function enviarOrcamento(idContratacao, valorCentavos, observacao) {
    const { data, error } = await supabaseClient.rpc('enviar_orcamento', {
        p_contratacao_id: Number(idContratacao),
        p_valor_centavos: valorCentavos,
        p_observacao: observacao || null
    });
    if (error) throw error;
    return data;
}


// Cliente aprova (true) ou recusa (false) o orçamento aguardando.
async function responderOrcamento(idOrcamento, aprovar) {
    const { data, error } = await supabaseClient.rpc('responder_orcamento', {
        p_orcamento_id: Number(idOrcamento),
        p_aprovar: Boolean(aprovar)
    });
    if (error) throw error;
    return data;
}


// Realtime dos orçamentos de UMA contratação (o RLS só entrega às partes).
function assinarOrcamentos(idContratacao, aoMudar) {
    return supabaseClient
        .channel('orcamentos-' + idContratacao)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'orcamentos', filter: `contratacao_id=eq.${idContratacao}` },
            () => aoMudar())
        .subscribe();
}


// Mensagem para a tela. As funções do banco já falam português com 22023/42501 (texto escrito na
// migration 015, sem dado de ninguém), então ele é mostrado como veio; o resto vira texto fixo.
function traduzirErroOrcamento(falha) {
    const codigo = falha && falha.code;
    const texto = ((falha && falha.message) || '').toLowerCase();

    if ((codigo === '22023' || codigo === '42501') && falha.message) return falha.message;
    if (texto.includes('failed to fetch') || texto.includes('network')) {
        return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    }
    if (codigo === 'PGRST202' || texto.includes('could not find the function')) {
        return 'O orçamento ainda não está disponível. Avise a equipe (migration 015).';
    }
    return 'Não foi possível concluir agora. Tente novamente.';
}
