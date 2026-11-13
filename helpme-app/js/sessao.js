// SESSÃO E ROTEAMENTO (sessao.js)
// OBJETIVO: ÚNICO lugar que decide "quem pode ver esta página" e "para onde o login leva".
// POR QUÊ: antes cada script checava a sessão do seu jeito (e o login mandava todo
// profissional para o feed, aprovado ou não). Centralizar evita regras divergentes.
// ORDEM DOS SCRIPTS: CDN supabase-js -> js/supabase-config.js -> (js/categorias.js) -> js/sessao.js -> script da página.
// Globais criadas aqui (NÃO redeclarar em outro script):
//   funções: exigirSessao, destinoDoUsuario, sair, voltarSeguro, lerVoltarDaUrl,
//            calcularDestino, buscarUsuario, buscarSituacaoProfissional, buscarEhAdmin, ehPaginaAdmin;
//   constantes: PAGINA_INICIAL_CLIENTE, PAGINA_LOGIN, PAGINA_COMPLETAR_PERFIL,
//               PAGINA_BLOQUEIO, PAGINA_ADMIN, DESTINO_PROFISSIONAL_APROVADO.


// Página inicial do cliente (e home pública do app).
const PAGINA_INICIAL_CLIENTE = 'home-cliente.html';
const PAGINA_LOGIN = 'index.html';
const PAGINA_COMPLETAR_PERFIL = 'completar-perfil.html';
const PAGINA_BLOQUEIO = 'bloqueio.html';

// Área administrativa (US-014). Admin é quem tem linha em 'administradores' (BR11),
// não um tipo_usuario: por isso a checagem é separada (função eh_admin() no banco).
const PAGINA_ADMIN = 'admin.html';

// Profissional aprovado cai na lista de contratações recebidas (US-008).
// (O antigo feed-profissional.html, que lia a tabela 'pedidos', foi removido no DEBT-006.)
const DESTINO_PROFISSIONAL_APROVADO = 'contratacoes.html';


// Valida o parâmetro ?voltar= para evitar "open redirect" (um link malicioso
// mandando o usuário, já logado, para outro site).
// Aceita só um nome de arquivo .html do próprio app, com query opcional:
//   ok:     'profissional.html?id=abc', 'contratacoes.html'
//   recusa: 'https://x.com', '//x.com', 'javascript:...', '../x.html', 'pasta/x.html'
// Retorna o valor aceito ou null.
function voltarSeguro(valor) {
    if (typeof valor !== 'string') return null;

    const texto = valor.trim();
    if (!texto || texto.length > 300) return null;

    // Nada de esquema (http:, javascript:), rede (//), subir pasta (..) ou barra invertida.
    if (texto.includes('//') || texto.includes(':') || texto.includes('..') || texto.includes('\\')) {
        return null;
    }

    // Nome de arquivo simples terminado em .html (sem pasta) + query opcional, sem #.
    if (!/^[A-Za-z0-9_-]+\.html(\?[^#\s]*)?$/.test(texto)) return null;

    // Não faz sentido "voltar" para o próprio login.
    if (texto.split('?')[0] === PAGINA_LOGIN) return null;

    return texto;
}


// Lê o ?voltar= da URL atual (já validado).
function lerVoltarDaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    return voltarSeguro(parametros.get('voltar'));
}


// Páginas da área admin: admin.html, admin-analise.html, admin-categorias.html...
// Recebe só o nome do arquivo (com ou sem ?query).
function ehPaginaAdmin(pagina) {
    return typeof pagina === 'string' && /^admin[A-Za-z0-9_-]*\.html$/.test(pagina.split('?')[0]);
}


// Regra pura de roteamento (sem banco), separada para ficar fácil de testar.
// situacao = { ehAdmin: boolean, tipo: 'cliente'|'profissional', status: null|'pendente'|'aprovado'|'recusado', totalCategorias: number }
// status null = profissional ainda sem linha em 'profissionais'.
function calcularDestino(situacao, voltar) {
    const voltarOk = voltarSeguro(voltar);

    // Admin vem antes da regra de cliente/profissional (US-014, critério 2).
    // Só aceita voltar para outra página admin; qualquer outro destino cai no painel.
    if (situacao && situacao.ehAdmin) {
        return voltarOk && ehPaginaAdmin(voltarOk) ? voltarOk : PAGINA_ADMIN;
    }

    if (!situacao || situacao.tipo !== 'profissional') {
        return voltarOk || PAGINA_INICIAL_CLIENTE;
    }

    // Perfil incompleto: sem linha ou sem categoria (o cadastro pode ter parado no meio).
    if (!situacao.status || !situacao.totalCategorias) {
        return PAGINA_COMPLETAR_PERFIL;
    }

    if (situacao.status === 'aprovado') {
        return voltarOk || DESTINO_PROFISSIONAL_APROVADO;
    }

    // 'pendente', 'recusado' ou qualquer valor inesperado: não libera o app.
    return PAGINA_BLOQUEIO;
}


// Busca a linha do usuário em 'usuarios' (criada pelo trigger do cadastro).
async function buscarUsuario(userId) {
    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, nome, tipo_usuario, telefone')
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
}


// Situação do profissional: status de aprovação (null se não tem perfil) e quantas categorias tem.
async function buscarSituacaoProfissional(userId) {
    const { data: perfil, error: erroPerfil } = await supabaseClient
        .from('profissionais')
        .select('status_aprovacao')
        .eq('id', userId)
        .maybeSingle();

    if (erroPerfil) throw erroPerfil;
    if (!perfil) return { status: null, totalCategorias: 0 };

    // head: true conta as linhas sem baixá-las.
    const { count, error: erroCategorias } = await supabaseClient
        .from('profissional_categoria')
        .select('categoria_id', { count: 'exact', head: true })
        .eq('profissional_id', userId);

    if (erroCategorias) throw erroCategorias;

    return { status: perfil.status_aprovacao, totalCategorias: count || 0 };
}


// Quem está logado é administrador? Pergunta ao banco (eh_admin() só responde sobre quem chama).
// Se a migration 003 ainda não foi aplicada, a função não existe (PGRST202): ninguém é admin,
// e o login dos outros usuários continua funcionando. Outros erros sobem para quem chama.
async function buscarEhAdmin() {
    const { data, error } = await supabaseClient.rpc('eh_admin');

    if (error) {
        if (error.code === 'PGRST202') {
            console.warn('Função eh_admin() não encontrada: aplique supabase/migrations/003_admin.sql.');
            return false;
        }
        throw error;
    }
    return data === true;
}


// Para onde o login leva este usuário.
// `voltar` é opcional: se omitido, usa o ?voltar= da URL atual.
// Lança erro se não conseguir ler o banco (quem chama mostra a mensagem).
async function destinoDoUsuario(userId, voltar) {
    if (!supabaseClient) throw new Error('Cliente do Supabase indisponível.');

    const voltarUsado = voltar === undefined ? lerVoltarDaUrl() : voltar;

    if (await buscarEhAdmin()) {
        return calcularDestino({ ehAdmin: true }, voltarUsado);
    }

    const usuario = await buscarUsuario(userId);

    if (!usuario) {
        throw new Error('Perfil de usuário não encontrado.');
    }

    if (usuario.tipo_usuario !== 'profissional') {
        return calcularDestino({ tipo: usuario.tipo_usuario }, voltarUsado);
    }

    const situacao = await buscarSituacaoProfissional(userId);
    return calcularDestino({ tipo: 'profissional', status: situacao.status, totalCategorias: situacao.totalCategorias }, voltarUsado);
}


// Protege uma página. Uso no início do script da página:
//   const sessao = await exigirSessao('profissional');
//   if (!sessao) return; // já redirecionou
// - sem sessão: vai ao login com ?voltar=<esta página>;
// - tipo errado: vai para a página inicial do próprio tipo;
// - 'admin': exige linha em 'administradores' (eh_admin()); quem não é vai para a própria página inicial;
// - ok: devolve { user, usuario } (usuario = linha de 'usuarios'; com 'admin', também ehAdmin: true).
// Lança erro se o Supabase estiver indisponível ou a leitura falhar.
async function exigirSessao(tipoEsperado) {
    if (!supabaseClient) throw new Error('Cliente do Supabase indisponível.');

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const sessao = data && data.session;

    if (!sessao) {
        const paginaAtual = window.location.pathname.split('/').pop() + window.location.search;
        const voltar = voltarSeguro(paginaAtual);
        // replace: o botão "voltar" do navegador não cai de novo na página protegida.
        window.location.replace(voltar ? PAGINA_LOGIN + '?voltar=' + encodeURIComponent(voltar) : PAGINA_LOGIN);
        return null;
    }

    const usuario = await buscarUsuario(sessao.user.id);

    if (!usuario) {
        throw new Error('Perfil de usuário não encontrado.');
    }

    // Páginas admin*.html: o papel vem de 'administradores', não de tipo_usuario (US-014, critério 3).
    if (tipoEsperado === 'admin') {
        if (await buscarEhAdmin()) {
            return { user: sessao.user, usuario: usuario, ehAdmin: true };
        }
        // Não é admin: vai para a página inicial do próprio tipo (o voltar é ignorado).
        window.location.replace(await destinoDoUsuario(sessao.user.id, null));
        return null;
    }

    if (tipoEsperado && usuario.tipo_usuario !== tipoEsperado) {
        // O voltar é ignorado aqui: a página atual já é do tipo errado.
        const destino = usuario.tipo_usuario === 'profissional'
            ? await destinoDoUsuario(sessao.user.id, null)
            : PAGINA_INICIAL_CLIENTE;
        window.location.replace(destino);
        return null;
    }

    return { user: sessao.user, usuario: usuario };
}


// Encerra a sessão e volta para a home pública.
// Mesmo se o signOut falhar (ex.: sem rede) a sessão local é descartada pelo supabase-js,
// então o redirecionamento acontece de qualquer jeito.
async function sair() {
    try {
        if (supabaseClient) await supabaseClient.auth.signOut();
    } catch (erro) {
        console.error('Erro ao sair:', erro);
    }
    window.location.replace(PAGINA_INICIAL_CLIENTE);
}
