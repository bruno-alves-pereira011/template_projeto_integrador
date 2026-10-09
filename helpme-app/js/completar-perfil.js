// COMPLETAR / EDITAR PERFIL DO PROFISSIONAL (completar-perfil.js) — US-005
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// Fluxo:
//   1. exigirSessao('profissional') — cliente ou visitante não fica aqui.
//   2. Carrega categorias, o perfil (se já existir) e as categorias marcadas.
//   3. Ao salvar: valida no front, grava o perfil (insert na 1ª vez, update depois)
//      e sincroniza as categorias (insere as novas antes de apagar as desmarcadas,
//      para nunca ficar com zero categorias se a 2ª chamada falhar).
// SEGURANÇA: 'status_aprovacao' NUNCA é enviado. O banco força 'pendente' no insert e
// recusa mudança de status vinda do app; a idade 18+ também é garantida por trigger.

(function () {
    'use strict';

    const el = {
        carregando: document.getElementById('perfil-carregando'),
        erroCarga: document.getElementById('perfil-erro-carga'),
        erroCargaTexto: document.getElementById('perfil-erro-carga-texto'),
        btnRecarregar: document.getElementById('btn-recarregar'),
        status: document.getElementById('perfil-status'),
        statusTexto: document.getElementById('perfil-status-texto'),
        statusAcoes: document.getElementById('perfil-status-acoes'),
        linkPerfilPublico: document.getElementById('link-perfil-publico'),
        titulo: document.getElementById('perfil-titulo'),
        subtitulo: document.getElementById('perfil-subtitulo'),
        form: document.getElementById('form-perfil'),
        mensagem: document.getElementById('perfil-mensagem'),
        whatsapp: document.getElementById('whatsapp'),
        telefone: document.getElementById('telefone'),
        cidade: document.getElementById('cidade'),
        bairro: document.getElementById('bairro'),
        descricao: document.getElementById('descricao'),
        nascimento: document.getElementById('data_nascimento'),
        grupoCategorias: document.getElementById('grupo-categorias'),
        listaCategorias: document.getElementById('lista-categorias'),
        modeloCategoria: document.getElementById('modelo-categoria'),
        btnSalvar: document.getElementById('btn-salvar'),
        linkSituacao: document.getElementById('link-situacao'),
        btnSair: document.getElementById('btn-sair')
    };

    // Estado da página.
    let uid = null;
    let perfilExiste = false;          // já há linha em 'profissionais'?
    let primeiroCadastro = true;       // a página abriu sem perfil? (decide o redirecionamento final)
    let categoriasAtuais = new Set();  // ids gravados no banco neste momento

    // ==========================================
    // REGRAS PURAS (sem DOM/banco)
    // ==========================================

    // Idade completa em anos a partir de 'AAAA-MM-DD'.
    // Lê a data pelos números (new Date('AAAA-MM-DD') seria UTC e, no Brasil, viraria o dia anterior).
    // Retorna null se a data for inválida.
    function calcularIdade(dataISO, hoje) {
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO || '');
        if (!partes) return null;

        const ano = Number(partes[1]);
        const mes = Number(partes[2]);
        const dia = Number(partes[3]);

        // Rejeita datas impossíveis (ex.: 2001-02-30).
        const conferida = new Date(ano, mes - 1, dia);
        if (conferida.getFullYear() !== ano || conferida.getMonth() !== mes - 1 || conferida.getDate() !== dia) {
            return null;
        }

        const referencia = hoje || new Date();
        const anoHoje = referencia.getFullYear();
        const mesHoje = referencia.getMonth() + 1;
        const diaHoje = referencia.getDate();

        let idade = anoHoje - ano;
        // Ainda não fez aniversário este ano. Nascido em 29/02 completa anos em 01/03 nos anos
        // não bissextos — igual ao banco (current_date - interval '18 years').
        if (mesHoje < mes || (mesHoje === mes && diaHoje < dia)) {
            idade -= 1;
        }
        return idade;
    }

    // Data máxima de nascimento para ter 18 anos hoje ('AAAA-MM-DD'), usada no atributo max do campo.
    function dataLimite18Anos(hoje) {
        const referencia = hoje || new Date();
        const ano = referencia.getFullYear() - 18;
        const mes = referencia.getMonth();
        // 29/02 em ano não bissexto vira 28/02.
        const dia = Math.min(referencia.getDate(), new Date(ano, mes + 1, 0).getDate());
        const doisDigitos = (n) => String(n).padStart(2, '0');
        return ano + '-' + doisDigitos(mes + 1) + '-' + doisDigitos(dia);
    }

    // Telefone/WhatsApp: 10 a 13 dígitos (DDD + número, com ou sem 55).
    function telefoneValido(valor) {
        const digitos = valor.replace(/\D/g, '');
        return digitos.length >= 10 && digitos.length <= 13;
    }

    // ==========================================
    // UTILITÁRIOS DE TELA
    // ==========================================

    function mostrarMensagem(texto, tipo) {
        el.mensagem.textContent = texto || '';
        el.mensagem.className = 'mensagem mensagem-' + (tipo || 'erro');
        el.mensagem.hidden = !texto;
    }

    // Erro junto ao campo (o <p id="erro-..."> já está no aria-describedby do campo).
    function mostrarErroCampo(campo, idErro, texto) {
        const erro = document.getElementById(idErro);
        erro.textContent = texto || '';
        erro.hidden = !texto;
        if (texto) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');
    }

    function definirCarregando(carregando) {
        el.btnSalvar.disabled = carregando;
        el.btnSalvar.textContent = carregando ? 'Salvando...' : 'Salvar perfil';
    }

    // Traduz erros do banco/rede em mensagem para o usuário. Detalhe técnico fica no console.
    function traduzirErroBanco(erro) {
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (texto.includes('18 anos')) return 'É preciso ter 18 anos ou mais para se cadastrar como profissional.';
        if (texto.includes('somente usuários do tipo profissional')) return 'Sua conta não é de profissional. Crie uma conta de profissional para preencher este perfil.';
        if (texto.includes('failed to fetch') || texto.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
        if ((erro && erro.code === '42501') || texto.includes('row-level security')) return 'Você não tem permissão para esta alteração. Saia e entre de novo.';
        return 'Não foi possível salvar agora. Tente novamente.';
    }

    // ==========================================
    // CARGA
    // ==========================================

    function montarCategorias(categorias) {
        el.listaCategorias.replaceChildren();
        categorias.forEach((categoria) => {
            const item = el.modeloCategoria.content.cloneNode(true);
            const caixa = item.querySelector('input');
            caixa.value = String(categoria.id);
            caixa.checked = categoriasAtuais.has(categoria.id);
            item.querySelector('.opcao-nome').textContent = categoria.nome;
            el.listaCategorias.appendChild(item);
        });
    }

    function preencherFormulario(perfil, usuario) {
        // Primeira vez: o telefone do cadastro (opcional) já vem sugerido.
        el.whatsapp.value = (perfil && perfil.whatsapp) || '';
        el.telefone.value = (perfil && perfil.telefone) || (usuario && usuario.telefone) || '';
        el.cidade.value = (perfil && perfil.cidade) || '';
        el.bairro.value = (perfil && perfil.bairro) || '';
        el.descricao.value = (perfil && perfil.descricao) || '';
        el.nascimento.value = (perfil && perfil.data_nascimento) || '';
        el.nascimento.max = dataLimite18Anos();
    }

    // Aviso de acordo com o status real do banco (o ?aprovado=1 da URL é só a origem do redirecionamento;
    // não anunciamos "publicado" sem o banco confirmar).
    function mostrarStatus(status) {
        el.statusAcoes.hidden = true;
        el.linkSituacao.hidden = true;

        if (status === 'aprovado') {
            el.status.className = 'mensagem mensagem-sucesso';
            el.statusTexto.textContent = 'Seu perfil está publicado no diretório. O que você salvar aqui aparece para os clientes.';
            el.linkPerfilPublico.href = 'profissional.html?id=' + encodeURIComponent(uid);
            el.statusAcoes.hidden = false;
        } else if (status === 'pendente') {
            el.status.className = 'mensagem mensagem-info';
            el.statusTexto.textContent = 'Seu cadastro está em análise. Você pode editar o perfil; isso não reinicia a análise.';
            el.linkSituacao.hidden = false;
        } else if (status === 'recusado') {
            el.status.className = 'mensagem mensagem-erro';
            el.statusTexto.textContent = 'Seu cadastro foi recusado. Fale com a equipe do HelpMe para saber como regularizar.';
            el.linkSituacao.hidden = false;
        } else {
            el.status.hidden = true;
            return;
        }
        el.status.hidden = false;
    }

    async function carregar() {
        el.carregando.hidden = false;
        el.erroCarga.hidden = true;
        el.form.hidden = true;

        try {
            const sessao = await exigirSessao('profissional');
            if (!sessao) return; // já redirecionou

            uid = sessao.user.id;

            // As três leituras são independentes: em paralelo.
            const [respCategorias, respPerfil, respVinculos] = await Promise.all([
                supabaseClient.from('categorias').select('id, slug, nome, descricao, sigla, cor').order('nome', { ascending: true }),
                supabaseClient.from('profissionais')
                    .select('whatsapp, telefone, cidade, bairro, descricao, data_nascimento, status_aprovacao')
                    .eq('id', uid)
                    .maybeSingle(),
                supabaseClient.from('profissional_categoria').select('categoria_id').eq('profissional_id', uid)
            ]);

            if (respCategorias.error) throw respCategorias.error;
            if (respPerfil.error) throw respPerfil.error;
            if (respVinculos.error) throw respVinculos.error;

            const perfil = respPerfil.data;
            perfilExiste = Boolean(perfil);
            primeiroCadastro = !perfilExiste;
            categoriasAtuais = new Set((respVinculos.data || []).map((v) => v.categoria_id));

            if (!respCategorias.data || respCategorias.data.length === 0) {
                throw new Error('Nenhuma categoria cadastrada no banco.');
            }

            if (perfilExiste) {
                el.titulo.textContent = 'Meu perfil profissional';
                el.subtitulo.textContent = 'Mantenha seus dados de contato e categorias atualizados.';
            }

            montarCategorias(respCategorias.data);
            preencherFormulario(perfil, sessao.usuario);
            mostrarStatus(perfil ? perfil.status_aprovacao : null);

            el.carregando.hidden = true;
            el.form.hidden = false;
        } catch (erro) {
            console.error('Erro ao carregar o perfil:', erro);
            el.carregando.hidden = true;
            el.erroCargaTexto.textContent = 'Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.';
            el.erroCarga.hidden = false;
        }
    }

    // ==========================================
    // VALIDAÇÃO E GRAVAÇÃO
    // ==========================================

    function categoriasMarcadas() {
        const marcadas = el.listaCategorias.querySelectorAll('input[name="categoria"]:checked');
        return new Set(Array.from(marcadas, (caixa) => Number(caixa.value)));
    }

    // Marca os campos com problema e devolve o primeiro inválido (para receber o foco) ou null.
    function validar(dados, marcadas) {
        let primeiro = null;
        const marcar = (campo, idErro, texto) => {
            mostrarErroCampo(campo, idErro, texto);
            if (texto && !primeiro) primeiro = campo;
        };

        marcar(el.whatsapp, 'erro-whatsapp',
            telefoneValido(dados.whatsapp) ? '' : 'Informe um WhatsApp com DDD (ex.: 11 91234-5678).');
        marcar(el.telefone, 'erro-telefone',
            !dados.telefone || telefoneValido(dados.telefone) ? '' : 'Telefone inválido: informe DDD + número.');
        marcar(el.cidade, 'erro-cidade', dados.cidade ? '' : 'Informe sua cidade.');

        const idade = calcularIdade(dados.data_nascimento);
        let erroIdade = '';
        if (idade === null) erroIdade = 'Informe uma data de nascimento válida.';
        else if (idade < 0 || idade > 120) erroIdade = 'Confira a data de nascimento.';
        else if (idade < 18) erroIdade = 'É preciso ter 18 anos ou mais para se cadastrar como profissional.';
        marcar(el.nascimento, 'erro-data_nascimento', erroIdade);

        const erroCategorias = marcadas.size ? '' : 'Marque pelo menos uma categoria.';
        mostrarErroCampo(el.grupoCategorias, 'erro-categorias', erroCategorias);
        if (erroCategorias && !primeiro) primeiro = el.listaCategorias.querySelector('input');

        return primeiro;
    }

    // Grava o perfil. Nunca inclui status_aprovacao.
    async function salvarPerfil(dados) {
        if (!perfilExiste) {
            const { error } = await supabaseClient.from('profissionais').insert({ id: uid, ...dados });
            if (error) throw error;
            perfilExiste = true;
            return;
        }

        // .select() devolve as linhas alteradas: zero linhas = o RLS bloqueou em silêncio.
        const { data, error } = await supabaseClient.from('profissionais').update(dados).eq('id', uid).select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            const semLinha = new Error('Nenhuma linha atualizada (RLS ou perfil inexistente).');
            semLinha.code = '42501';
            throw semLinha;
        }
    }

    // Deixa profissional_categoria igual às caixas marcadas.
    // Insere antes de apagar: se o delete falhar, o perfil continua com categorias.
    // ignoreDuplicates = "on conflict do nothing": reenviar não dá erro de chave duplicada.
    async function sincronizarCategorias(marcadas) {
        const adicionar = [...marcadas].filter((id) => !categoriasAtuais.has(id));
        const remover = [...categoriasAtuais].filter((id) => !marcadas.has(id));

        if (adicionar.length) {
            const linhas = adicionar.map((id) => ({ profissional_id: uid, categoria_id: id }));
            const { error } = await supabaseClient
                .from('profissional_categoria')
                .upsert(linhas, { onConflict: 'profissional_id,categoria_id', ignoreDuplicates: true });
            if (error) throw error;
            adicionar.forEach((id) => categoriasAtuais.add(id));
        }

        if (remover.length) {
            const { error } = await supabaseClient
                .from('profissional_categoria')
                .delete()
                .eq('profissional_id', uid)
                .in('categoria_id', remover);
            if (error) throw error;
            remover.forEach((id) => categoriasAtuais.delete(id));
        }
    }

    el.form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        mostrarMensagem('');

        const dados = {
            whatsapp: el.whatsapp.value.trim(),
            telefone: el.telefone.value.trim() || null,
            cidade: el.cidade.value.trim(),
            bairro: el.bairro.value.trim() || null,
            descricao: el.descricao.value.trim() || null,
            data_nascimento: el.nascimento.value
        };
        const marcadas = categoriasMarcadas();

        const invalido = validar({ ...dados, telefone: dados.telefone || '' }, marcadas);
        if (invalido) {
            invalido.focus();
            return;
        }

        definirCarregando(true);
        let etapa = 'perfil';

        try {
            await salvarPerfil(dados);
            etapa = 'categorias';
            await sincronizarCategorias(marcadas);

            if (primeiroCadastro) {
                // Cadastro novo sempre nasce 'pendente': vai para a tela de análise.
                window.location.replace(PAGINA_BLOQUEIO);
                return;
            }

            mostrarMensagem('Perfil salvo com sucesso.', 'sucesso');
            el.mensagem.focus();
        } catch (erro) {
            console.error('Erro ao salvar (' + etapa + '):', erro);

            const texto = traduzirErroBanco(erro);
            if (etapa === 'perfil' && texto.includes('18 anos')) {
                mostrarErroCampo(el.nascimento, 'erro-data_nascimento', texto);
                el.nascimento.focus();
            } else if (etapa === 'categorias') {
                // O perfil foi gravado, as categorias não. Reenviar é seguro (update + upsert idempotente);
                // e enquanto não houver categoria, o login traz o profissional de volta para cá.
                mostrarMensagem('Seus dados foram salvos, mas as categorias não. ' + texto + ' Clique em "Salvar perfil" de novo.');
                el.mensagem.focus();
            } else {
                mostrarMensagem(texto);
                el.mensagem.focus();
            }
        } finally {
            definirCarregando(false);
        }
    });

    // Tirar o erro do grupo assim que alguma categoria for marcada.
    el.listaCategorias.addEventListener('change', () => {
        if (categoriasMarcadas().size) mostrarErroCampo(el.grupoCategorias, 'erro-categorias', '');
    });

    el.btnRecarregar.addEventListener('click', carregar);
    el.btnSair.addEventListener('click', sair);

    carregar();
})();
