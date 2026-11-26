// CATEGORIAS DE SERVIÇO (categorias.js)
// OBJETIVO: Buscar as categorias na tabela 'categorias' do Supabase.
// POR QUÊ: antes cada script tinha a sua lista fixa (e elas divergiam). Agora o banco é a
// única fonte: renomear uma categoria no Table Editor muda o app inteiro após recarregar.
// DEPENDE DE: js/servicos/supabase-config.js carregado antes (usa a global `supabaseClient`).


// Busca as categorias ordenadas por nome.
// opcoes.somenteAtivas (US-018, BR20): true na home, que só oferece categorias ativas.
// Sem a opção vêm todas: o perfil público e a lista de profissionais precisam da cor/sigla
// também das desativadas, porque o vínculo do profissional é mantido.
// Retorna: [{ slug, nome, descricao, sigla, cor, ativa }, ...]
// Em caso de falha (sem internet, RLS, tabela inexistente) LANÇA um erro:
// quem chama decide como avisar o usuário (try/catch), em vez de receber uma lista vazia silenciosa.
async function carregarCategorias(opcoes) {
    if (!supabaseClient) {
        throw new Error('Cliente do Supabase indisponível.');
    }

    let consulta = supabaseClient
        .from('categorias')
        .select('slug, nome, descricao, sigla, cor, ativa')
        .order('nome', { ascending: true });
    if (opcoes && opcoes.somenteAtivas) consulta = consulta.eq('ativa', true);

    const { data, error } = await consulta;

    if (error) throw error;

    return data || [];
}


// Monta um "dicionário" { slug: categoria } a partir da lista,
// útil para achar a cor/sigla de um item que só guarda o slug (ex.: um pedido).
function mapaCategoriasPorSlug(categorias) {
    const mapa = {};

    (categorias || []).forEach((categoria) => {
        mapa[categoria.slug] = categoria;
    });

    return mapa;
}
