// GESTÃO DE CATEGORIAS (admin-categorias.js) — US-018
// DEPENDE DE (nesta ordem): CDN supabase-js -> supabase-config.js -> sessao.js -> admin-comum.js.
// Fluxo:
//   1. exigirSessao('admin').
//   2. Lê todas as categorias (ativas e inativas) direto da tabela 'categorias'.
//   3. Cria (insert) e edita (update) pelo formulário; desativa/reativa (update de 'ativa').
//      Não existe apagar (BR20). O banco confere tudo de novo (013): só admin escreve,
//      slug único, formatos de slug, sigla e cor.
// SEGURANÇA: textos do banco só com textContent. Update que volta sem linha = o RLS barrou.

(function () {
    'use strict';

    const adm = window.HelpMeAdmin;
    const el = (id) => document.getElementById(id);

    const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const SIGLA = /^[A-Z0-9]{1,3}$/;
    const COR = /^#[0-9a-fA-F]{6}$/;
    const COR_PADRAO = '#13695f';
    const CAMPOS = ['nome', 'slug', 'sigla', 'descricao'];

    let categorias = [];
    let editandoId = null;   // null = criando
    let slugManual = false;  // o admin mexeu no slug? então o nome não o sobrescreve
    let ocupado = false;

    // ---------- utilidades ----------

    // "Ar-Condicionado & Refrigeração" -> "ar-condicionado-refrigeracao"
    function slugificar(texto) {
        return (texto || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40)
            .replace(/-+$/, '');
    }

    function mostrarEstado(estado) {
        el('lista-carregando').hidden = estado !== 'carregando';
        el('lista-erro').hidden = estado !== 'erro';
        el('lista-vazia').hidden = estado !== 'vazia';
    }

    function avisar(texto, tipo) {
        const aviso = el('categorias-mensagem');
        aviso.textContent = texto;
        aviso.classList.toggle('aviso-erro', tipo === 'erro');
        aviso.hidden = !texto;
        if (texto) aviso.focus();
    }

    function erroCampo(campo, texto) {
        const caixa = el('erro-' + campo);
        const entrada = el(campo);
        caixa.textContent = texto || '';
        caixa.hidden = !texto;
        if (texto) entrada.setAttribute('aria-invalid', 'true'); else entrada.removeAttribute('aria-invalid');
    }

    function limparErros() {
        CAMPOS.forEach((campo) => erroCampo(campo, ''));
        el('form-mensagem').hidden = true;
    }

    // Erros do banco em texto para o admin. Devolve { campo, texto } (campo null = mensagem geral).
    function traduzirErroBanco(erro) {
        const codigo = (erro && erro.code) || '';
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (codigo === '23505' || texto.includes('duplicate key')) {
            return { campo: 'slug', texto: 'Já existe uma categoria com este endereço (slug). Escolha outro.' };
        }
        if (codigo === '23514' || texto.includes('check constraint')) {
            if (texto.includes('slug')) return { campo: 'slug', texto: 'Use só minúsculas, números e hífen (até 40).' };
            if (texto.includes('sigla')) return { campo: 'sigla', texto: 'Use de 1 a 3 letras maiúsculas ou números.' };
            if (texto.includes('nome')) return { campo: 'nome', texto: 'O nome precisa ter de 2 a 40 caracteres.' };
            if (texto.includes('descricao')) return { campo: 'descricao', texto: 'A descrição pode ter até 200 caracteres.' };
            if (texto.includes('cor')) return { campo: null, texto: 'Escolha uma cor válida.' };
        }
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return { campo: null, texto: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.' };
        }
        if (codigo === '42501' || texto.includes('row-level security')) {
            return { campo: null, texto: 'Sua conta não tem permissão de administrador para esta ação.' };
        }
        return { campo: null, texto: 'Não foi possível salvar agora. Tente novamente.' };
    }

    // ---------- lista ----------

    function desenhar() {
        const lista = el('lista-categorias');
        lista.replaceChildren();

        const ativas = categorias.filter((c) => c.ativa).length;
        el('categorias-total').textContent = categorias.length
            ? `${categorias.length} categoria${categorias.length === 1 ? '' : 's'}: ${ativas} ativa${ativas === 1 ? '' : 's'} e ${categorias.length - ativas} inativa${categorias.length - ativas === 1 ? '' : 's'}.`
            : 'Nenhuma categoria cadastrada.';
        mostrarEstado(categorias.length ? '' : 'vazia');

        categorias.forEach((c) => {
            const card = el('modelo-card-categoria').content.firstElementChild.cloneNode(true);
            card.classList.toggle('categoria-inativa', !c.ativa);

            const sigla = card.querySelector('.sigla-categoria');
            sigla.textContent = c.sigla;
            if (COR.test(c.cor || '')) sigla.style.backgroundColor = c.cor;

            card.querySelector('.card-categoria-nome').textContent = c.nome;
            card.querySelector('.card-categoria-slug').textContent = `/${c.slug} · cor ${c.cor}`;
            const desc = card.querySelector('.card-categoria-descricao');
            desc.textContent = c.descricao || '';
            desc.hidden = !c.descricao;

            const selo = card.querySelector('.selo-situacao-categoria');
            selo.textContent = c.ativa ? 'Ativa' : 'Inativa';
            selo.classList.add(c.ativa ? 'situacao-ativa' : 'situacao-inativa');

            const editar = card.querySelector('.btn-editar');
            editar.setAttribute('aria-label', `Editar ${c.nome}`);
            editar.disabled = ocupado;
            editar.addEventListener('click', () => iniciarEdicao(c));

            const alternar = card.querySelector('.btn-alternar');
            alternar.textContent = c.ativa ? 'Desativar' : 'Reativar';
            alternar.setAttribute('aria-label', `${c.ativa ? 'Desativar' : 'Reativar'} ${c.nome}`);
            alternar.disabled = ocupado;
            alternar.addEventListener('click', () => alternarAtiva(c));

            lista.appendChild(card);
        });
    }

    async function carregar() {
        mostrarEstado('carregando');
        try {
            const { data, error } = await supabaseClient
                .from('categorias')
                .select('id, slug, nome, descricao, sigla, cor, ativa')
                .order('nome', { ascending: true });
            if (error) throw error;
            categorias = data || [];
            desenhar();
        } catch (falha) {
            console.error('Erro ao carregar categorias:', falha);
            el('lista-erro-texto').textContent = traduzirErroBanco(falha).texto.replace('salvar', 'carregar');
            el('lista-categorias').replaceChildren();
            mostrarEstado('erro');
        }
    }

    // ---------- formulário ----------

    function modoCriar() {
        editandoId = null;
        slugManual = false;
        el('form-categoria').reset();
        el('cor').value = COR_PADRAO;
        atualizarCor();
        atualizarContador();
        limparErros();
        el('titulo-form').textContent = 'Nova categoria';
        el('btn-salvar').textContent = 'Criar categoria';
        el('btn-cancelar-edicao').hidden = true;
    }

    function iniciarEdicao(c) {
        editandoId = c.id;
        slugManual = true;   // na edição o slug só muda se o admin mexer
        limparErros();
        el('nome').value = c.nome;
        el('slug').value = c.slug;
        el('sigla').value = c.sigla;
        el('cor').value = COR.test(c.cor || '') ? c.cor.toLowerCase() : COR_PADRAO;
        el('descricao').value = c.descricao || '';
        atualizarCor();
        atualizarContador();
        el('titulo-form').textContent = `Editar "${c.nome}"`;
        el('btn-salvar').textContent = 'Salvar alterações';
        el('btn-cancelar-edicao').hidden = false;
        el('nome').focus();
    }

    function atualizarCor() {
        el('cor-valor').textContent = el('cor').value;
    }

    function atualizarContador() {
        el('descricao-contador').textContent = `${el('descricao').value.length}/200`;
    }

    function lerFormulario() {
        return {
            nome: el('nome').value.trim(),
            slug: el('slug').value.trim(),
            sigla: el('sigla').value.trim().toUpperCase(),
            cor: el('cor').value,
            descricao: el('descricao').value.trim() || null
        };
    }

    // Mesmas regras do banco (013). Devolve o primeiro campo inválido ou null.
    function validar(d) {
        let primeiro = null;
        const falhar = (campo, texto) => { erroCampo(campo, texto); if (!primeiro) primeiro = el(campo); };

        if (d.nome.length < 2 || d.nome.length > 40) falhar('nome', 'Informe um nome de 2 a 40 caracteres.');
        if (!SLUG.test(d.slug) || d.slug.length > 40) falhar('slug', 'Use só minúsculas, números e hífen, sem espaço (ex.: ar-condicionado).');
        else if (categorias.some((c) => c.slug === d.slug && c.id !== editandoId)) falhar('slug', 'Já existe uma categoria com este endereço (slug). Escolha outro.');
        if (!SIGLA.test(d.sigla)) falhar('sigla', 'Use de 1 a 3 letras ou números.');
        if (d.descricao && d.descricao.length > 200) falhar('descricao', 'A descrição pode ter até 200 caracteres.');
        if (!COR.test(d.cor)) { el('form-mensagem').textContent = 'Escolha uma cor válida.'; el('form-mensagem').hidden = false; }
        return primeiro;
    }

    function definirOcupado(valor) {
        ocupado = valor;
        el('btn-salvar').disabled = valor;
        el('btn-cancelar-edicao').disabled = valor;
        document.querySelectorAll('#lista-categorias button').forEach((b) => { b.disabled = valor; });
    }

    async function salvar(evento) {
        evento.preventDefault();
        if (ocupado) return;
        limparErros();
        avisar('');

        const dados = lerFormulario();
        el('sigla').value = dados.sigla;
        const invalido = validar(dados);
        if (invalido) { invalido.focus(); return; }
        if (!el('form-mensagem').hidden) { el('form-mensagem').focus(); return; }

        const criando = editandoId === null;
        definirOcupado(true);
        el('btn-salvar').textContent = 'Salvando...';
        try {
            let resposta;
            if (criando) {
                resposta = await supabaseClient.from('categorias').insert(dados).select('id');
            } else {
                resposta = await supabaseClient.from('categorias').update(dados).eq('id', editandoId).select('id');
            }
            if (resposta.error) throw resposta.error;
            if (!resposta.data || resposta.data.length === 0) {
                throw { code: '42501', message: 'row-level security: nenhuma linha alterada' };
            }

            modoCriar();
            await carregar();
            avisar(criando ? `Categoria "${dados.nome}" criada. Ela já aparece na página inicial.`
                           : `Categoria "${dados.nome}" atualizada.`);
        } catch (falha) {
            console.error('Erro ao salvar categoria:', falha);
            const t = traduzirErroBanco(falha);
            if (t.campo) {
                erroCampo(t.campo, t.texto);
                el(t.campo).focus();
            } else {
                el('form-mensagem').textContent = t.texto;
                el('form-mensagem').hidden = false;
                el('form-mensagem').focus();
            }
        } finally {
            definirOcupado(false);
            el('btn-salvar').textContent = editandoId === null ? 'Criar categoria' : 'Salvar alterações';
        }
    }

    async function alternarAtiva(c) {
        if (ocupado) return;
        const ativar = !c.ativa;
        if (!ativar && !window.confirm(`Desativar "${c.nome}"? Ela sai da página inicial e do cadastro de profissionais. Quem já tem a categoria continua com ela.`)) {
            return;
        }

        avisar('');
        definirOcupado(true);
        try {
            const { data, error } = await supabaseClient
                .from('categorias').update({ ativa: ativar }).eq('id', c.id).select('id');
            if (error) throw error;
            if (!data || data.length === 0) throw { code: '42501', message: 'row-level security: nenhuma linha alterada' };
            await carregar();
            avisar(ativar ? `"${c.nome}" reativada: volta a aparecer na página inicial.`
                          : `"${c.nome}" desativada. Os profissionais que já a tinham continuam com ela.`);
        } catch (falha) {
            console.error('Erro ao alterar a situação da categoria:', falha);
            avisar(traduzirErroBanco(falha).texto.replace('salvar', 'alterar a categoria'), 'erro');
        } finally {
            definirOcupado(false);
        }
    }

    // ---------- início ----------

    async function iniciar() {
        mostrarEstado('carregando');
        try {
            const sessao = await exigirSessao('admin');
            if (!sessao) return; // já redirecionou
        } catch (falha) {
            console.error('Erro ao verificar o acesso:', falha);
            el('lista-erro-texto').textContent = adm.traduzirErro(falha);
            mostrarEstado('erro');
            return;
        }
        modoCriar();
        await carregar();
    }

    el('nome').addEventListener('input', () => {
        if (!slugManual) el('slug').value = slugificar(el('nome').value);
    });
    el('slug').addEventListener('input', () => { slugManual = el('slug').value !== ''; });
    el('sigla').addEventListener('input', () => { el('sigla').value = el('sigla').value.toUpperCase(); });
    el('cor').addEventListener('input', atualizarCor);
    el('descricao').addEventListener('input', atualizarContador);
    el('form-categoria').addEventListener('submit', salvar);
    el('btn-cancelar-edicao').addEventListener('click', () => { modoCriar(); el('nome').focus(); });
    el('btn-tentar-novamente').addEventListener('click', carregar);
    el('btn-sair').addEventListener('click', sair);

    iniciar();
})();
