// CONTRATAÇÃO — FUNÇÕES COMUNS (contratacao-comum.js) — US-008 / US-009
// OBJETIVO: o que contratacoes.html, espera-cliente.html e servico-andamento.html fazem igual:
// ler uma contratação, ler o contato da outra parte, mudar o status, ouvir o Realtime, rótulos e datas.
// COMO USAR: script clássico, depois de js/supabase-config.js e antes do script da página.
// API PÚBLICA (globais): lerIdContratacaoDaUrl, buscarContratacao, buscarContatoContraparte,
//   mudarStatusContratacao, assinarContratacao, rotuloStatusContratacao, textoDataContratacao,
//   PAGINA_ESPERA_CLIENTE, PAGINA_SERVICO_ANDAMENTO, PAGINA_CONTRATACOES, paginaDaContratacao.
// SEGURANÇA: quem decide o que cada um lê e quais transições valem é o banco (RLS, trigger
// validar_contratacao e função contato_contraparte). Aqui só se consome.

// Telas da contratação (decisão D8: os nomes antigos foram mantidos)
const PAGINA_ESPERA_CLIENTE = 'espera-cliente.html';       // 'solicitada' (e o desfecho recusada/cancelada)
const PAGINA_SERVICO_ANDAMENTO = 'servico-andamento.html'; // 'aceita' e 'concluida'
const PAGINA_CONTRATACOES = 'contratacoes.html';           // listas do cliente e do profissional

// Colunas lidas em todas as telas
const COLUNAS_CONTRATACAO = 'id, cliente_id, profissional_id, descricao, endereco, data_desejada, status, created_at, updated_at';


// Tela de detalhe certa para o status: aceita/concluída -> serviço em andamento; o resto -> espera.
function paginaDaContratacao(contratacao) {
    const pagina = contratacao.status === 'aceita' || contratacao.status === 'concluida'
        ? PAGINA_SERVICO_ANDAMENTO
        : PAGINA_ESPERA_CLIENTE;
    return `${pagina}?id=${encodeURIComponent(contratacao.id)}`;
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
