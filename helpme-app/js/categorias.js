// CATEGORIAS DE SERVIÇO (categorias.js)
// OBJETIVO: Buscar as categorias na tabela 'categorias' do Supabase.
// POR QUÊ: antes cada script tinha a sua lista fixa (e elas divergiam). Agora o banco é a
// única fonte: renomear uma categoria no Table Editor muda o app inteiro após recarregar.
// DEPENDE DE: js/supabase-config.js carregado antes (usa a global `supabaseClient`).


// Busca todas as categorias ordenadas por nome.
// Retorna: [{ slug, nome, descricao, sigla, cor }, ...]
// Em caso de falha (sem internet, RLS, tabela inexistente) LANÇA um erro:
// quem chama decide como avisar o usuário (try/catch), em vez de receber uma lista vazia silenciosa.
async function carregarCategorias() {
    if (!supabaseClient) {
        throw new Error('Cliente do Supabase indisponível.');
    }

    const { data, error } = await supabaseClient
        .from('categorias')
        .select('slug, nome, descricao, sigla, cor')
        .order('nome', { ascending: true });

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
