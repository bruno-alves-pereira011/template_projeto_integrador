// SESSÃO E ROTEAMENTO (sessao.js)
// OBJETIVO: ÚNICO lugar que decide "quem pode ver esta página" e "para onde o login leva".
// POR QUÊ: antes cada script checava a sessão do seu jeito (e o login mandava todo
// profissional para o feed, aprovado ou não). Centralizar evita regras divergentes.
// ORDEM DOS SCRIPTS: CDN supabase-js -> js/servicos/supabase-config.js -> (js/servicos/categorias.js) -> js/servicos/sessao.js -> script da página.
// Globais criadas aqui (NÃO redeclarar em outro script):
//   funções: exigirSessao, destinoDoUsuario, sair, encerrarSessao, voltarSeguro, lerVoltarDaUrl,
//            calcularDestino, profissionalLiberado, lerPapel, destinoDoPapel, buscarUsuario,
//            buscarSituacaoProfissional, buscarEhAdmin, ehPaginaAdmin, chaveDaSessaoSalva, uidDaSessaoSalva;
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


/// Profissional liberado para usar o app: aprovado e com pelo menos uma categoria (BR03).
// situacao = { status, totalCategorias } (buscarSituacaoProfissional).
function profissionalLiberado(situacao) {
    return Boolean(situacao) && situacao.status === 'aprovado' && situacao.totalCategorias > 0;
}


// Regra pura de roteamento (sem banco), separada para ficar fácil de testar.
// situacao = { ehAdmin: boolean, tipo: 'cliente'|'profissional', status: null|'pendente'|'aprovado'|'recusado'|'suspenso', totalCategorias: number }
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

    if (profissionalLiberado(situacao)) {
        return voltarOk || DESTINO_PROFISSIONAL_APROVADO;
    }

    // 'pendente', 'recusado', 'suspenso' (US-019) ou qualquer valor inesperado: não libera o app.
    return PAGINA_BLOQUEIO;
}


// Busca a linha do usuário em 'usuarios' (criada pelo trigger do cadastro).
// comContato = true inclui o telefone: só as telas de perfil precisam dele, e o menu das
// páginas públicas não deve trafegar dado de contato à toa.
async function buscarUsuario(userId, comContato) {
    const colunas = comContato ? 'id, nome, tipo_usuario, telefone' : 'id, nome, tipo_usuario';
    const { data, error } = await supabaseClient
        .from('usuarios')
        .select(colunas)
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


// PAPEL de quem está logado: a ÚNICA regra de "quem é quem" do app (DEBT-009).
// Usada pelo login (destinoDoUsuario), pela proteção das páginas (exigirSessao) e pelo menu (js/telas/navegacao.js).
// Devolve { papel, usuario, situacao }:
//   'admin'        tem linha em 'administradores' (BR11). Vem antes do tipo: a conta admin é do tipo
//                  'cliente' no banco, mas NÃO é cliente: não contrata nem usa as telas de cliente (BR10).
//   'profissional' tipo_usuario 'profissional'; situacao = { status, totalCategorias }.
//   'cliente'      qualquer outro tipo.
// usuario = linha de 'usuarios' (só o admin pode não ter). Lança erro se alguma leitura falhar.
async function lerPapel(userId, comContato) {
    const [usuario, ehAdmin] = await Promise.all([buscarUsuario(userId, comContato), buscarEhAdmin()]);

    if (ehAdmin) return { papel: 'admin', usuario: usuario, situacao: null };

    if (!usuario) throw new Error('Perfil de usuário não encontrado.');

    if (usuario.tipo_usuario !== 'profissional') return { papel: 'cliente', usuario: usuario, situacao: null };

    const situacao = await buscarSituacaoProfissional(userId);
    return { papel: 'profissional', usuario: usuario, situacao: situacao };
}


// Página inicial de um papel já lido por lerPapel (a mesma para onde o login leva).
function destinoDoPapel(papelLido, voltar) {
    return calcularDestino({
        ehAdmin: papelLido.papel === 'admin',
        tipo: papelLido.papel === 'profissional' ? 'profissional' : 'cliente',
        ...(papelLido.situacao || {})
    }, voltar);
}


// Para onde o login leva este usuário.
// `voltar` é opcional: se omitido, usa o ?voltar= da URL atual.
// Lança erro se não conseguir ler o banco (quem chama mostra a mensagem).
async function destinoDoUsuario(userId, voltar) {
    if (!supabaseClient) throw new Error('Cliente do Supabase indisponível.');

    const voltarUsado = voltar === undefined ? lerVoltarDaUrl() : voltar;
    return destinoDoPapel(await lerPapel(userId), voltarUsado);
}


// Protege uma página. Uso no início do script da página:
//   const sessao = await exigirSessao('profissional');
//   if (!sessao) return; // já redirecionou
// tipoEsperado: 'cliente' | 'profissional' | 'admin', ou omitido (qualquer papel logado).
// - sem sessão: vai ao login com ?voltar=<esta página>;
// - papel diferente do esperado: vai para a página inicial do próprio papel (o voltar é ignorado,
//   a página atual já é do papel errado). O admin NÃO passa em 'cliente' (BR10/BR11);
// - ok: devolve { user, usuario, papel, situacao, ehAdmin } (usuario com telefone).
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

    const papelLido = await lerPapel(sessao.user.id, true);

    if (!papelLido.usuario) {
        throw new Error('Perfil de usuário não encontrado.');
    }

    if (tipoEsperado && papelLido.papel !== tipoEsperado) {
        window.location.replace(destinoDoPapel(papelLido, null));
        return null;
    }

    return {
        user: sessao.user,
        usuario: papelLido.usuario,
        papel: papelLido.papel,
        situacao: papelLido.situacao,
        ehAdmin: papelLido.papel === 'admin'
    };
}


// Chave do localStorage onde o supabase-js guarda a sessão ('sb-<projeto>-auth-token').
function chaveDaSessaoSalva() {
    const daBiblioteca = supabaseClient && supabaseClient.auth && supabaseClient.auth.storageKey;
    return daBiblioteca || `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
}


// id do usuário da sessão salva neste navegador, lido na hora (sem rede), ou null.
// Serve só para decisões VISUAIS imediatas: esconder "Entrar" enquanto o papel carrega e notar
// um login ou logout feito em outra aba. Quem decide acesso é exigirSessao e o RLS do banco.
function uidDaSessaoSalva() {
    try {
        const bruto = window.localStorage.getItem(chaveDaSessaoSalva());
        const salvo = bruto ? JSON.parse(bruto) : null;
        const usuario = salvo && (salvo.user || (salvo.currentSession && salvo.currentSession.user));
        return usuario && typeof usuario.id === 'string' ? usuario.id : null;
    } catch (erro) {
        return null;
    }
}


// Encerra a sessão NESTE navegador (scope 'local': o usuário continua logado nos outros aparelhos).
// Sem rede, o supabase-js devolve { error } e NÃO apaga a sessão salva: aí ela é apagada aqui,
// para o "Sair" nunca deixar o usuário logado. Nunca lança.
async function encerrarSessao() {
    if (!supabaseClient) return;

    let falhou = false;
    try {
        const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
        if (error) {
            falhou = true;
            console.error('Erro ao sair (a sessão deste navegador é apagada mesmo assim):', error);
        }
    } catch (erro) {
        falhou = true;
        console.error('Erro ao sair (a sessão deste navegador é apagada mesmo assim):', erro);
    }

    if (falhou) {
        try {
            window.localStorage.removeItem(chaveDaSessaoSalva());
        } catch (erro) {
            console.error('Não foi possível apagar a sessão salva:', erro);
        }
    }
}


// Encerra a sessão e volta para a home pública.
async function sair() {
    await encerrarSessao();
    window.location.replace(PAGINA_INICIAL_CLIENTE);
}
