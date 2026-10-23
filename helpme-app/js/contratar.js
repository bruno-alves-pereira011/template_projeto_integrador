// CONTRATAR PROFISSIONAL (contratar.js) — US-007 / FR10
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// Fluxo:
//   1. exigirSessao('cliente'): visitante vai ao login com ?voltar=contratar.html?profissional=<id>
//      e volta para cá depois de entrar; profissional é mandado para a página dele.
//   2. Lê o profissional na view 'profissionais_publicos' (só aprovados). Fora dela = "não disponível".
//   3. Valida no front e grava em 'contratacoes'. O banco valida de novo:
//      RLS "cliente contrata profissional aprovado" (BR10) e trigger validar_contratacao (BR09).
// SEGURANÇA: status, created_at e updated_at NUNCA são enviados (o banco usa 'solicitada' e now()).

(function () {
    'use strict';

    // Os ids dos profissionais são UUIDs (vêm do Auth). Outro formato nem chega ao banco.
    const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Mesmos limites do maxlength do HTML (o banco não limita estes campos).
    const MAX_DESCRICAO = 1000;
    const MAX_ENDERECO = 200;

    const el = {
        carregando: document.getElementById('contratar-carregando'),
        erroCarga: document.getElementById('contratar-erro-carga'),
        btnRecarregar: document.getElementById('btn-recarregar'),
        naoEncontrado: document.getElementById('contratar-nao-encontrado'),
        form: document.getElementById('form-contratar'),
        resumoNome: document.getElementById('resumo-nome'),
        resumoLocal: document.getElementById('resumo-local'),
        mensagem: document.getElementById('contratar-mensagem'),
        descricao: document.getElementById('descricao'),
        endereco: document.getElementById('endereco'),
        data: document.getElementById('data_desejada'),
        btnEnviar: document.getElementById('btn-enviar'),
        linkVoltarPerfil: document.getElementById('link-voltar-perfil'),
        sucesso: document.getElementById('contratar-sucesso'),
        sucessoTexto: document.getElementById('contratar-sucesso-texto'),
        linkVoltarPerfilSucesso: document.getElementById('link-voltar-perfil-sucesso'),
        btnSair: document.getElementById('btn-sair')
    };

    const idProfissional = (new URLSearchParams(window.location.search).get('profissional') || '').trim();

    let uid = null;
    let enviando = false;

    // ==========================================
    // REGRAS PURAS (sem DOM/banco)
    // ==========================================

    // Date -> 'AAAA-MM-DDTHH:MM' no horário LOCAL (formato do input datetime-local).
    // toISOString() não serve: devolve UTC e, no Brasil, mostraria 3 horas a mais.
    function paraValorLocal(data) {
        const doisDigitos = (n) => String(n).padStart(2, '0');
        return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate()) +
            'T' + doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes());
    }

    // 'AAAA-MM-DDTHH:MM' (horário local) -> Date. Retorna null se for inválido (ex.: 30/02).
    function lerDataLocal(valor) {
        const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor || '');
        if (!partes) return null;

        const [ano, mes, dia, hora, minuto] = partes.slice(1).map(Number);
        const data = new Date(ano, mes - 1, dia, hora, minuto);

        if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia ||
            data.getHours() !== hora || data.getMinutes() !== minuto) {
            return null;
        }
        return data;
    }

    // Valida os dados do formulário. Retorna { campo: mensagem } só com os campos inválidos.
    function validar(dados, agora) {
        const erros = {};

        if (!dados.descricao) erros.descricao = 'Descreva o serviço que você precisa.';
        else if (dados.descricao.length > MAX_DESCRICAO) erros.descricao = `Use no máximo ${MAX_DESCRICAO} caracteres.`;

        if (!dados.endereco) erros.endereco = 'Informe o endereço onde o serviço será feito.';
        else if (dados.endereco.length > MAX_ENDERECO) erros.endereco = `Use no máximo ${MAX_ENDERECO} caracteres.`;

        if (!dados.valorData) {
            erros.data_desejada = 'Escolha a data e o horário.';
        } else if (!dados.data) {
            erros.data_desejada = 'Data ou horário inválido.';
        } else if (dados.data.getTime() <= agora.getTime()) {
            // BR09 — o banco também recusa.
            erros.data_desejada = 'Escolha uma data e horário a partir de agora.';
        }

        return erros;
    }

    // ==========================================
    // UTILITÁRIOS DE TELA
    // ==========================================

    function mostrarEstado(estado) {
        el.carregando.hidden = estado !== 'carregando';
        el.erroCarga.hidden = estado !== 'erro';
        el.naoEncontrado.hidden = estado !== 'nao-encontrado';
        el.form.hidden = estado !== 'formulario';
        el.sucesso.hidden = estado !== 'sucesso';
    }

    function mostrarMensagem(texto, tipo) {
        el.mensagem.textContent = texto || '';
        el.mensagem.className = 'mensagem mensagem-' + (tipo || 'erro');
        el.mensagem.hidden = !texto;
    }

    // Erro junto ao campo (o <p id="erro-..."> já está no aria-describedby do campo).
    function mostrarErroCampo(campo, texto) {
        const erro = document.getElementById('erro-' + campo.id);
        erro.textContent = texto || '';
        erro.hidden = !texto;
        if (texto) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');
    }

    function definirCarregando(carregando) {
        enviando = carregando;
        el.btnEnviar.disabled = carregando;
        el.btnEnviar.textContent = carregando ? 'Enviando...' : 'Enviar solicitação';
    }

    // Traduz erros do banco/rede em mensagem para o usuário. Detalhe técnico fica no console.
    // Retorna { campo: elemento|null, texto }.
    function traduzirErroBanco(erro) {
        const texto = ((erro && erro.message) || '').toLowerCase();
        if (texto.includes('passado')) {
            return { campo: el.data, texto: 'Escolha uma data e horário a partir de agora.' };
        }
        // RLS (BR10): profissional deixou de estar aprovado ou a conta não é de cliente.
        if ((erro && erro.code === '42501') || texto.includes('row-level security')) {
            return { campo: null, texto: 'Não foi possível contratar este profissional: ele pode não estar mais disponível. Volte ao perfil e tente de novo.' };
        }
        if (texto.includes('failed to fetch') || texto.includes('network')) {
            return { campo: null, texto: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.' };
        }
        return { campo: null, texto: 'Não foi possível enviar a solicitação agora. Tente novamente.' };
    }

    // "Centro, Serra" (ou o que estiver preenchido)
    function textoLocal(prof) {
        const partes = [prof.bairro, prof.cidade].filter((parte) => parte && parte.trim());
        return partes.length ? partes.join(', ') : 'Local não informado';
    }

    // ==========================================
    // CARGA
    // ==========================================

    async function carregar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('cliente');
            if (!sessao) return; // já redirecionou
            uid = sessao.user.id;

            // id ausente ou com formato inválido: nem consulta o banco
            if (!FORMATO_UUID.test(idProfissional)) {
                mostrarEstado('nao-encontrado');
                return;
            }

            const { data: prof, error } = await supabaseClient
                .from('profissionais_publicos')
                .select('id, nome, cidade, bairro')
                .eq('id', idProfissional)
                .maybeSingle();

            if (error) throw error;

            // Inexistente ou não aprovado: a view não devolve a linha
            if (!prof) {
                mostrarEstado('nao-encontrado');
                return;
            }

            const nome = (prof.nome || '').trim() || 'Profissional';
            document.title = `HelpMe - Contratar ${nome}`;
            el.resumoNome.textContent = nome;
            el.resumoLocal.textContent = textoLocal(prof);

            const linkPerfil = `profissional.html?id=${encodeURIComponent(prof.id)}`;
            el.linkVoltarPerfil.href = linkPerfil;
            el.linkVoltarPerfilSucesso.href = linkPerfil;

            // Não deixa escolher data no passado no seletor (o JS e o banco validam de novo)
            el.data.min = paraValorLocal(new Date());

            mostrarEstado('formulario');
            el.descricao.focus();
        } catch (falha) {
            console.error('Erro ao carregar a página de contratação:', falha);
            mostrarEstado('erro');
        }
    }

    // ==========================================
    // ENVIO
    // ==========================================

    async function enviar(evento) {
        evento.preventDefault();
        if (enviando) return; // clique duplo

        mostrarMensagem('');

        const dados = {
            descricao: el.descricao.value.trim(),
            endereco: el.endereco.value.trim(),
            valorData: el.data.value,
            data: lerDataLocal(el.data.value)
        };

        const erros = validar(dados, new Date());
        [el.descricao, el.endereco, el.data].forEach((campo) => mostrarErroCampo(campo, erros[campo.id]));

        const primeiroInvalido = [el.descricao, el.endereco, el.data].find((campo) => erros[campo.id]);
        if (primeiroInvalido) {
            primeiroInvalido.focus();
            return;
        }

        definirCarregando(true);

        try {
            const { data, error } = await supabaseClient
                .from('contratacoes')
                .insert({
                    cliente_id: uid,
                    profissional_id: idProfissional,
                    descricao: dados.descricao,
                    endereco: dados.endereco,
                    // ISO com fuso: o banco guarda timestamptz e compara com now() (BR09)
                    data_desejada: dados.data.toISOString()
                })
                .select('id')
                .single();

            if (error) throw error;

            // TEMPORÁRIO até a US-009: quando contratacao.html existir, trocar o painel abaixo por
            //   window.location.replace('contratacao.html?id=' + data.id);
            el.sucessoTexto.textContent = `Solicitação nº ${data.id} enviada para ${el.resumoNome.textContent}!`;
            mostrarEstado('sucesso');
            el.sucesso.focus();
        } catch (falha) {
            console.error('Erro ao criar a contratação:', falha);
            const traduzido = traduzirErroBanco(falha);
            if (traduzido.campo) {
                mostrarErroCampo(traduzido.campo, traduzido.texto);
                traduzido.campo.focus();
            } else {
                mostrarMensagem(traduzido.texto);
                el.mensagem.focus();
            }
            definirCarregando(false);
        }
    }

    // ==========================================
    // INÍCIO
    // ==========================================

    el.form.addEventListener('submit', enviar);
    el.btnRecarregar.addEventListener('click', carregar);
    el.btnSair.addEventListener('click', sair);

    carregar();
})();
