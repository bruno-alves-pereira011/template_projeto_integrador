// ÁREA ADMINISTRATIVA — PAINEL (admin.js) — US-014 + US-017
// OBJETIVO: proteger admin.html, mostrar a casca da área admin e os indicadores.
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js -> js/admin-comum.js.
// SEGURANÇA: esconder a tela é só conveniência. O que protege os dados é o banco:
// painel_admin() confere eh_admin() e devolve só totais (NFR09, 006_painel.sql).

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);
    const numero = new Intl.NumberFormat('pt-BR');

    const STATUS_CONTRATACAO = [
        ['solicitada', 'Aguardando resposta'],
        ['aceita', 'Aceitas'],
        ['recusada', 'Recusadas'],
        ['cancelada', 'Canceladas'],
        ['concluida', 'Concluídas']
    ];

    function mostrarEstado(estado) {
        el('admin-carregando').hidden = estado !== 'carregando';
        el('admin-erro').hidden = estado !== 'erro';
        el('admin-conteudo').hidden = estado !== 'conteudo';
    }

    // "Ana Paula Rocha" -> "Ana"
    function primeiroNome(nome) {
        return (nome || '').trim().split(/\s+/)[0];
    }

    // ==========================================
    // FORMATAÇÃO
    // ==========================================

    function qtd(valor) {
        return numero.format(Number(valor) || 0);
    }

    // "1 profissional" / "3 profissionais"
    function plural(n, singular, pluralTexto) {
        return `${qtd(n)} ${Number(n) === 1 ? singular : pluralTexto}`;
    }

    // Horas (número ou null) -> "< 1 h" / "5 h" / "2,5 dias". null = sem dados.
    function duracao(horas) {
        if (horas === null || horas === undefined) return '—';
        const h = Number(horas);
        if (h < 1) return '< 1 h';
        if (h < 48) return `${Math.round(h)} h`;
        const dias = h / 24;
        return `${dias.toLocaleString('pt-BR', { maximumFractionDigits: dias < 10 ? 1 : 0 })} dias`;
    }

    function texto(id, valor) {
        el(id).textContent = valor;
    }

    // ==========================================
    // INDICADORES (US-017)
    // ==========================================

    function estadoIndicadores(estado) {
        el('indicadores-carregando').hidden = estado !== 'carregando';
        el('indicadores-erro').hidden = estado !== 'erro';
        el('indicadores-conteudo').hidden = estado !== 'conteudo';
        el('btn-atualizar-indicadores').disabled = estado === 'carregando';
    }

    function mostrarIndicadores(d) {
        const fila = d.fila || {};
        const prof = d.profissionais || {};
        const usu = d.usuarios || {};
        const taxa = d.taxa_aceite_30d || {};
        const cat = d.categorias || {};
        const contr = d.contratacoes || {};

        // Profissionais e fila
        texto('kpi-fila', qtd(fila.tamanho));
        const partesFila = [];
        if (fila.verde) partesFila.push(`${qtd(fila.verde)} verde${fila.verde === 1 ? '' : 's'} para aprovar em lote`);
        if (fila.pendencia) partesFila.push(`${qtd(fila.pendencia)} com pendência`);
        if (fila.suspeito) partesFila.push(`${qtd(fila.suspeito)} suspeito${fila.suspeito === 1 ? '' : 's'}`);
        if (fila.sem_triagem) partesFila.push(`${qtd(fila.sem_triagem)} sem triagem`);
        texto('kpi-fila-nota', fila.tamanho ? partesFila.join(' · ') + ' — abrir a fila' : 'Fila vazia — abrir a fila');

        texto('kpi-espera', fila.tamanho ? duracao(fila.espera_media_horas) : '—');
        texto('kpi-decisao', duracao(fila.decisao_media_horas_30d));
        texto('kpi-decisao-nota', fila.decisoes_30d
            ? `Média de ${plural(fila.decisoes_30d, 'decisão', 'decisões')} nos últimos 30 dias`
            : 'Nenhuma decisão nos últimos 30 dias');
        texto('kpi-aprovados', qtd(prof.aprovado));
        texto('kpi-recusados', qtd(prof.recusado));

        // Usuários
        texto('kpi-clientes', qtd(usu.clientes));
        texto('kpi-profissionais', qtd(usu.profissionais));
        texto('kpi-profissionais-nota', usu.profissionais_sem_perfil
            ? `${qtd(usu.profissionais_sem_perfil)} ainda sem perfil completo`
            : 'Todos com perfil preenchido');
        texto('kpi-admins', qtd(usu.administradores));

        // Contratações
        texto('kpi-aceite', taxa.percentual === null || taxa.percentual === undefined ? '—' : `${taxa.percentual}%`);
        texto('kpi-aceite-nota', taxa.respondidas
            ? `${qtd(taxa.aceitas)} aceitas de ${plural(taxa.respondidas, 'respondida', 'respondidas')}`
            : 'Nenhuma contratação respondida nos últimos 30 dias');

        const corpo = el('tabela-contratacoes');
        corpo.replaceChildren();
        const d7 = contr['7d'] || {};
        const d30 = contr['30d'] || {};
        [...STATUS_CONTRATACAO, ['total', 'Total']].forEach(([chave, rotulo]) => {
            const linha = document.createElement('tr');
            if (chave === 'total') linha.className = 'linha-total';
            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = rotulo;
            linha.append(th);
            [d7, d30].forEach((periodo) => {
                const td = document.createElement('td');
                td.textContent = qtd(periodo[chave]);
                linha.append(td);
            });
            corpo.append(linha);
        });

        // Categorias
        const semAprovado = Array.isArray(cat.sem_aprovado) ? cat.sem_aprovado : [];
        texto('kpi-categorias', qtd(semAprovado.length));
        texto('kpi-categorias-nota', semAprovado.length
            ? `De ${plural(cat.ativas, 'categoria ativa', 'categorias ativas')}. Clientes não encontram ninguém nelas.`
            : `Todas as ${plural(cat.ativas, 'categoria ativa', 'categorias ativas')} têm profissional aprovado.`);
        const lista = el('kpi-categorias-lista');
        lista.replaceChildren(...semAprovado.map((nome) => {
            const li = document.createElement('li');
            li.textContent = nome;
            return li;
        }));
        lista.hidden = semAprovado.length === 0;

        const quando = d.gerado_em ? new Date(d.gerado_em) : new Date();
        texto('indicadores-atualizado', `Atualizado às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    }

    async function carregarIndicadores() {
        estadoIndicadores('carregando');
        try {
            const { data, error } = await supabaseClient.rpc('painel_admin');
            if (error) throw error;
            mostrarIndicadores(data || {});
            estadoIndicadores('conteudo');
        } catch (erro) {
            console.error('Erro ao carregar os indicadores:', erro);
            texto('indicadores-erro-texto', erro && erro.code === 'PGRST202'
                ? 'Os indicadores ainda não foram instalados no banco (migration 006).'
                : window.HelpMeAdmin.traduzirErro(erro));
            estadoIndicadores('erro');
        }
    }

    // ==========================================
    // CARGA
    // ==========================================

    async function carregar() {
        mostrarEstado('carregando');

        try {
            const sessao = await exigirSessao('admin');
            if (!sessao) return; // já redirecionou (visitante ou não admin)

            const nome = primeiroNome(sessao.usuario.nome);
            el('admin-saudacao').textContent = nome ? `Olá, ${nome}` : 'Área administrativa';
            mostrarEstado('conteudo');
        } catch (falha) {
            console.error('Erro ao abrir a área administrativa:', falha);
            mostrarEstado('erro');
            return;
        }

        carregarIndicadores();
    }

    el('btn-tentar-novamente').addEventListener('click', carregar);
    el('btn-atualizar-indicadores').addEventListener('click', carregarIndicadores);
    el('btn-sair').addEventListener('click', sair);

    carregar();
})();
