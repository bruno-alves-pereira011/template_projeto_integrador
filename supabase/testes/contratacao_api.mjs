// ===================================================================
// HelpMe — teste de API, RLS, triggers e Realtime (US-007 a US-010)
// ===================================================================
// COMO RODAR (Node 22+ , sem instalar nada):
//   node supabase/testes/contratacao_api.mjs
// Usa a chave PÚBLICA (anon) de helpme-app/js/supabase-config.js e as
// contas do seed (senha em HELPME_SENHA, padrão Helpme@123).
//
// ATENÇÃO: GRAVA NO BANCO REAL. Cada contratação criada leva
// "[TESTE AUTO <data>]" na descrição. Para limpar depois (SQL Editor):
//   delete from public.contratacoes where descricao like '[TESTE AUTO%';
// (as mensagens saem junto, por cascade)
// ===================================================================

import { URL, KEY, TAG, sleep, login, api, criarRelatorio } from './_supabase.mjs';

const AMANHA = new Date(Date.now() + 86400000).toISOString();
const ONTEM = new Date(Date.now() - 86400000).toISOString();

const { check, bloqueado, resumo } = criarRelatorio();

const insertC = (u, row) => api(u, 'POST', 'contratacoes', row);
const updateC = (u, id, patch, extraFiltro = '') => api(u, 'PATCH', `contratacoes?id=eq.${id}${extraFiltro}`, patch);
const novaC = (u, prof, extra = {}) => insertC(u, {
    cliente_id: u.id, profissional_id: prof.id, descricao: `${TAG} ${extra.rotulo || ''}`.trim(),
    endereco: 'Rua Teste, 1 - Centro', data_desejada: AMANHA, ...(extra.campos || {}),
});
const contato = (u, id) => api(u, 'POST', 'rpc/contato_contraparte', { p_contratacao_id: id });

// ---------- Realtime (protocolo Phoenix do Supabase, WebSocket nativo) ----------
class Realtime {
    constructor(u) {
        this.u = u; this.eventos = []; this.ref = 0; this.esperas = new Map();
        this.ws = new WebSocket(`${URL.replace('https', 'wss')}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`);
        this.aberto = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
        this.ws.onmessage = (m) => {
            const msg = JSON.parse(m.data);
            if (msg.event === 'postgres_changes') this.eventos.push({ topic: msg.topic, ...msg.payload.data });
            if (msg.event === 'system' && msg.payload?.extension === 'postgres_changes') {
                const w = this.esperas.get(msg.topic);
                if (w) { w(msg.payload.status); this.esperas.delete(msg.topic); }
            }
            if (msg.event === 'phx_reply' && msg.payload?.status === 'error') {
                const w = this.esperas.get(msg.topic);
                if (w) { w('error:' + JSON.stringify(msg.payload.response)); this.esperas.delete(msg.topic); }
            }
        };
        this.hb = setInterval(() => this.enviar('phoenix', 'heartbeat', {}), 20000);
    }
    enviar(topic, event, payload) {
        const ref = String(++this.ref);
        this.ws.send(JSON.stringify({ topic, event, payload, ref, join_ref: ref }));
    }
    // Resolve com 'ok' quando o servidor confirma "Subscribed to PostgreSQL".
    async assinar(nome, table, filter) {
        await this.aberto;
        const topic = `realtime:${nome}`;
        const pronto = new Promise((res) => {
            this.esperas.set(topic, res);
            setTimeout(() => res('timeout'), 10000);
        });
        const pc = { event: '*', schema: 'public', table };
        if (filter) pc.filter = filter;
        this.enviar(topic, 'phx_join', {
            config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [pc] },
            access_token: this.u.token,
        });
        return pronto;
    }
    async esperar(pred, ms = 3000) {
        const fim = Date.now() + ms;
        while (Date.now() < fim) {
            const e = this.eventos.find(pred);
            if (e) return { e, ms: ms - (fim - Date.now()) };
            await sleep(50);
        }
        return null;
    }
    fechar() { clearInterval(this.hb); this.ws.close(); }
}

// ===================================================================
async function main() {
    console.log(`Projeto ${URL}\nMarcador: ${TAG}\n`);
    const cli = await login('cliente@helpme.test');
    const p1 = await login('prof1@helpme.test');   // aprovado
    const p2 = await login('prof2@helpme.test');   // aprovado, faz o papel de terceiro
    const p3 = await login('prof3@helpme.test');   // pendente

    // Conferência do pré-requisito: p1 e p2 aprovados, p3 pendente
    const st = await api(null, 'GET', `profissionais?select=id,status_aprovacao&id=in.(${p1.id},${p2.id},${p3.id})`);
    const status = Object.fromEntries((st.data || []).map((r) => [r.id, r.status_aprovacao]));
    const p3Pendente = !status[p3.id];
    check('P00', 'pre', 'prof1 e prof2 aprovados', status[p1.id] === 'aprovado' && status[p2.id] === 'aprovado', JSON.stringify(status));

    // Realtime aberto antes das ações (US-008 c3, US-009 c1/c2)
    const rtP1 = new Realtime(p1), rtCli = new Realtime(cli), rtP2 = new Realtime(p2);
    const sP1 = await rtP1.assinar('p1-contratacoes', 'contratacoes', `profissional_id=eq.${p1.id}`);
    const sP2 = await rtP2.assinar('p2-contratacoes', 'contratacoes'); // sem filtro: tenta ouvir tudo
    check('R00', 'infra', 'Realtime aceita assinatura em contratacoes (prof1 e terceiro)', sP1 === 'ok' && sP2 === 'ok', `${sP1} / ${sP2}`);

    // ================= US-007 — contratar =================
    let r = await novaC(cli, p1, { rotulo: 'US-007 feliz' });
    const c1 = r.data && r.data[0];
    check('US7-01', 'US-007', 'cliente cria contratacao com prof aprovado -> solicitada',
        r.status === 201 && c1?.status === 'solicitada', `${r.status} ${r.msg || ''}`);

    if (p3Pendente) {
        r = await novaC(cli, p3, { rotulo: 'prof pendente' });
        check('US7-02', 'US-007', 'banco recusa contratar profissional pendente (c5)', r.status === 403 && r.code === '42501', `${r.status} ${r.code}`);
    } else {
        bloqueado('US7-02', 'US-007', 'banco recusa contratar profissional pendente (c5)',
            'prof3@helpme.test esta APROVADO no banco real (o seed o cria pendente); nao ha profissional pendente para testar');
    }

    r = await novaC(cli, p1, { rotulo: 'passado', campos: { data_desejada: ONTEM } });
    check('US7-03', 'US-007', 'banco recusa data no passado (c5, BR09)', r.status >= 400 && /passado/i.test(r.msg || ''), `${r.status} ${r.msg}`);

    r = await insertC(p1, { cliente_id: p1.id, profissional_id: p2.id, descricao: `${TAG} prof contrata`, endereco: 'x', data_desejada: AMANHA });
    check('US7-04', 'US-007', 'banco recusa contratacao feita por profissional (c5, BR10)', r.status === 403 && r.code === '42501', `${r.status} ${r.code}`);

    r = await insertC(cli, { cliente_id: p2.id, profissional_id: p1.id, descricao: `${TAG} em nome de outro`, endereco: 'x', data_desejada: AMANHA });
    check('US7-05', 'US-007', 'cliente nao cria em nome de outra pessoa', r.status === 403, `${r.status} ${r.code}`);

    r = await novaC(cli, p1, { rotulo: 'ja aceita', campos: { status: 'aceita' } });
    check('US7-06', 'US-007', 'cliente nao cria ja com status aceita', r.status === 403, `${r.status} ${r.code}`);

    r = await novaC(cli, p1, { rotulo: 'created_at forjado', campos: { created_at: '2000-01-01T00:00:00Z' } });
    const cForj = r.data && r.data[0];
    check('US7-07', 'US-007', 'created_at forjado e trocado pelo do servidor',
        r.status === 201 && new Date(cForj.created_at).getFullYear() > 2020, `${r.status} ${cForj?.created_at}`);

    r = await insertC(null, { cliente_id: cli.id, profissional_id: p1.id, descricao: `${TAG} anon`, endereco: 'x', data_desejada: AMANHA });
    check('US7-08', 'US-007', 'visitante (anon) nao cria contratacao', r.status === 401 || r.status === 403, `${r.status} ${r.code}`);

    r = await novaC(cli, p1, { rotulo: '', campos: { descricao: '   ', endereco: '   ' } });
    const cVazia = r.data && r.data[0];
    check('US7-09', 'US-007', '[observacao] banco recusa descricao/endereco so com espacos',
        r.status >= 400, `banco ACEITOU (${r.status}); so o front valida os campos obrigatorios`);

    // ================= US-008 — aceitar / recusar =================
    const ev1 = await rtP1.esperar((e) => e.type === 'INSERT' && e.record?.id === c1?.id);
    check('US8-01', 'US-008', 'Realtime: nova solicitacao chega ao profissional em ate 3s (c3)', !!ev1, 'sem evento');
    if (ev1) console.log(`        (chegou em ~${ev1.ms} ms)`);

    r = await api(p1, 'GET', `contratacoes?select=id,status,descricao,endereco,data_desejada&id=eq.${c1?.id}`);
    check('US8-02', 'US-008', 'profissional le a contratacao recebida com descricao, endereco e data (c1)',
        r.data?.length === 1 && r.data[0].endereco && r.data[0].data_desejada, JSON.stringify(r.data));

    r = await api(p2, 'GET', `contratacoes?select=id&id=eq.${c1?.id}`);
    check('US8-03', 'US-008', 'terceiro nao enxerga a contratacao', r.status === 200 && r.data.length === 0, JSON.stringify(r.data));

    r = await updateC(p2, c1?.id, { status: 'aceita' });
    check('US8-04', 'US-008', 'outro profissional nao aceita contratacao alheia (c5)', r.status === 200 && r.data.length === 0, `${r.status} ${JSON.stringify(r.data)}`);

    r = await updateC(cli, c1?.id, { status: 'aceita' });
    check('US8-05', 'US-008', 'cliente nao aceita a propria contratacao', r.status >= 400 && /profissional/i.test(r.msg || ''), `${r.status} ${r.msg}`);

    r = await updateC(p1, c1?.id, { status: 'concluida' });
    check('US8-06', 'US-008', 'profissional nao pula solicitada -> concluida (c5)', r.status >= 400 && /transi/i.test(r.msg || ''), `${r.status} ${r.msg}`);

    r = await updateC(p1, c1?.id, { descricao: 'alterada' });
    check('US8-07', 'US-008', 'profissional nao altera outros campos', r.status >= 400, `${r.status} ${r.msg}`);

    // Contato antes do aceite (US-009 c4)
    r = await contato(p1, c1?.id);
    const antes = r.data?.[0];
    check('US9-07', 'US-009', 'antes do aceite o profissional ve so o primeiro nome, sem telefone (c4, BR07)',
        antes && antes.contato_liberado === false && !antes.telefone && !/\s/.test(antes.nome || ''), JSON.stringify(r.data));

    // Realtime do cliente na contratação (US-009 c1/c2)
    const sCli = await rtCli.assinar('cli-c1', 'contratacoes', `id=eq.${c1?.id}`);
    r = await updateC(p1, c1?.id, { status: 'aceita' }, '&status=eq.solicitada');
    check('US8-08', 'US-008', 'profissional aceita (c2)', r.status === 200 && r.data[0]?.status === 'aceita', `${r.status} ${r.msg || JSON.stringify(r.data)}`);
    const ev2 = await rtCli.esperar((e) => e.type === 'UPDATE' && e.record?.id === c1?.id && e.record?.status === 'aceita');
    check('US9-01', 'US-009', 'Realtime: cliente recebe o aceite sem recarregar em ate 3s (c1, c2)', sCli === 'ok' && !!ev2, `assinatura ${sCli}`);
    if (ev2) console.log(`        (chegou em ~${ev2.ms} ms)`);

    r = await contato(p1, c1?.id);
    const depois = r.data?.[0];
    check('US9-08', 'US-009', 'depois do aceite o profissional ve nome completo e telefone do cliente (c4)',
        depois && depois.contato_liberado === true && depois.telefone, JSON.stringify(r.data));
    r = await contato(cli, c1?.id);
    check('US9-09', 'US-009', 'cliente ve nome, telefone e WhatsApp do profissional (c4)',
        r.data?.[0]?.nome && (r.data[0].telefone || r.data[0].whatsapp), JSON.stringify(r.data));
    r = await contato(p2, c1?.id);
    check('US9-10', 'US-009', 'terceiro nao recebe contato de ninguem', r.status === 200 && r.data.length === 0, JSON.stringify(r.data));
    r = await contato(null, c1?.id);
    check('US9-11', 'US-009', 'visitante nao executa contato_contraparte', r.status === 401 || r.status === 403 || r.status === 404, `${r.status}`);

    r = await updateC(p1, c1?.id, { status: 'recusada' });
    check('US8-09', 'US-008', 'aceita nao volta para recusada', r.status >= 400, `${r.status} ${r.msg}`);

    // Recusa
    r = await novaC(cli, p1, { rotulo: 'US-008 recusa' });
    const c2 = r.data?.[0];
    r = await updateC(p1, c2?.id, { status: 'recusada' }, '&status=eq.solicitada');
    check('US8-10', 'US-008', 'profissional recusa (c2)', r.data?.[0]?.status === 'recusada', `${r.status} ${r.msg}`);
    r = await updateC(p1, c2?.id, { status: 'aceita' });
    check('US8-11', 'US-008', 'recusada nao pode ser aceita depois', r.status >= 400, `${r.status} ${r.msg}`);

    // Corrida: cliente cancela, profissional tenta aceitar (c4)
    r = await novaC(cli, p1, { rotulo: 'US-008 corrida' });
    const c3 = r.data?.[0];
    r = await updateC(cli, c3?.id, { status: 'cancelada' }, '&status=eq.solicitada');
    check('US9-02', 'US-009', 'cliente cancela enquanto solicitada (c3)', r.data?.[0]?.status === 'cancelada', `${r.status} ${r.msg}`);
    r = await updateC(p1, c3?.id, { status: 'aceita' }, '&status=eq.solicitada');
    check('US8-12', 'US-008', 'aceite depois do cancelamento nao altera nada (c4: 0 linhas com filtro de status)',
        r.status === 200 && r.data.length === 0, `${r.status} ${JSON.stringify(r.data)}`);
    r = await updateC(p1, c3?.id, { status: 'aceita' });
    check('US8-13', 'US-008', 'aceite depois do cancelamento, sem filtro, e recusado pelo trigger', r.status >= 400, `${r.status} ${r.msg}`);

    // ================= US-009 — cancelar / concluir =================
    r = await updateC(p1, c2?.id, { status: 'cancelada' });
    check('US9-03', 'US-009', 'profissional nao cancela', r.status >= 400, `${r.status} ${r.msg}`);
    r = await updateC(cli, c1?.id, { status: 'cancelada' });
    check('US9-04', 'US-009', 'cliente nao cancela depois do aceite', r.status >= 400, `${r.status} ${r.msg}`);
    r = await updateC(p2, c1?.id, { status: 'concluida' });
    check('US9-05', 'US-009', 'terceiro nao conclui', r.status === 200 && r.data.length === 0, `${r.status} ${JSON.stringify(r.data)}`);

    // ================= US-010 — chat (antes de concluir c1) =================
    const rtCliMsg = new Realtime(cli), rtP1Msg = new Realtime(p1), rtP2Msg = new Realtime(p2);
    const sm = await Promise.all([
        rtCliMsg.assinar('cli-msg', 'mensagens', `contratacao_id=eq.${c1?.id}`),
        rtP1Msg.assinar('p1-msg', 'mensagens', `contratacao_id=eq.${c1?.id}`),
        rtP2Msg.assinar('p2-msg', 'mensagens', `contratacao_id=eq.${c1?.id}`),
    ]);
    check('R01', 'infra', 'Realtime aceita assinatura em mensagens', sm.every((s) => s === 'ok'), sm.join(' / '));

    const msg = (u, cid, conteudo, autor = u.id) => api(u, 'POST', 'mensagens', { contratacao_id: cid, autor_id: autor, conteudo });
    r = await msg(cli, c1?.id, 'teste 1');
    const m1 = r.data?.[0];
    check('US10-01', 'US-010', 'cliente envia mensagem em aceita', r.status === 201, `${r.status} ${r.msg}`);
    const evm1 = await rtP1Msg.esperar((e) => e.type === 'INSERT' && e.record?.id === m1?.id);
    check('US10-02', 'US-010', 'Realtime: mensagem do cliente chega ao profissional em ate 3s (c2, CH-01)', !!evm1, 'sem evento');
    if (evm1) console.log(`        (chegou em ~${evm1.ms} ms)`);

    r = await msg(p1, c1?.id, 'teste 2');
    const m2 = r.data?.[0];
    const evm2 = await rtCliMsg.esperar((e) => e.type === 'INSERT' && e.record?.id === m2?.id);
    check('US10-03', 'US-010', 'Realtime: resposta do profissional chega ao cliente em ate 3s (c2, CH-02)', !!evm2, 'sem evento');
    if (evm2) console.log(`        (chegou em ~${evm2.ms} ms)`);

    // 5 mensagens alternadas (CH-03)
    const ids = [];
    for (let i = 0; i < 5; i++) {
        const u = i % 2 ? p1 : cli;
        const rr = await msg(u, c1?.id, `seq ${i + 1}`);
        ids.push(rr.data?.[0]?.id);
    }
    await sleep(2500);
    const recebidos = (rt) => rt.eventos.filter((e) => e.type === 'INSERT' && ids.includes(e.record?.id)).map((e) => e.record.id);
    const rc = recebidos(rtCliMsg), rp = recebidos(rtP1Msg);
    const semDup = (a) => new Set(a).size === a.length;
    check('US10-04', 'US-010', 'Realtime: 5 mensagens alternadas chegam inteiras, sem duplicar, na mesma ordem (CH-03)',
        rc.length === 5 && rp.length === 5 && semDup(rc) && semDup(rp) && rc.join() === ids.join() && rp.join() === ids.join(),
        `cliente ${rc.join()} / prof ${rp.join()} / esperado ${ids.join()}`);

    check('US10-05', 'US-010', 'Realtime: terceiro inscrito na conversa NAO recebe nada (c6)',
        rtP2Msg.eventos.length === 0, `${rtP2Msg.eventos.length} eventos vazaram`);

    r = await api(cli, 'GET', `mensagens?select=id,autor_id,conteudo,created_at&contratacao_id=eq.${c1?.id}&order=created_at.asc,id.asc`);
    const ordenado = r.data?.every((m, i, a) => i === 0 || a[i - 1].created_at <= m.created_at);
    check('US10-06', 'US-010', 'historico em ordem cronologica com autor e horario (c1)',
        r.data?.length === 7 && ordenado && r.data.every((m) => m.autor_id && m.created_at), `${r.data?.length} msgs`);

    r = await msg(cli, c1?.id, '<b>oi</b>');
    check('US10-07', 'US-010', 'conteudo HTML e gravado literalmente (c5, parte do banco)', r.data?.[0]?.conteudo === '<b>oi</b>', JSON.stringify(r.data));

    r = await api(p2, 'GET', `mensagens?select=id&contratacao_id=eq.${c1?.id}`);
    check('US10-08', 'US-010', 'terceiro nao le mensagens (c6, CH-12)', r.status === 200 && r.data.length === 0, JSON.stringify(r.data));
    r = await msg(p2, c1?.id, 'invasao');
    check('US10-09', 'US-010', 'terceiro nao envia (c6, CH-12)', r.status === 403 && r.code === '42501', `${r.status} ${r.code}`);
    r = await msg(p2, c1?.id, 'invasao', cli.id);
    check('US10-10', 'US-010', 'terceiro nao envia em nome do cliente', r.status === 403, `${r.status} ${r.code}`);
    r = await msg(cli, c1?.id, 'falso', p1.id);
    check('US10-11', 'US-010', 'parte nao envia em nome da outra', r.status === 403, `${r.status} ${r.code}`);
    r = await msg(cli, c1?.id, '     ');
    check('US10-12', 'US-010', 'mensagem so com espacos e recusada (c3)', r.status >= 400 && r.code === '23514', `${r.status} ${r.code}`);
    r = await msg(cli, c1?.id, 'a'.repeat(1000));
    check('US10-13', 'US-010', '1000 caracteres e aceita (c3)', r.status === 201, `${r.status} ${r.code}`);
    r = await msg(cli, c1?.id, 'a'.repeat(1001));
    check('US10-14', 'US-010', '1001 caracteres e recusada (c3)', r.status >= 400 && r.code === '23514', `${r.status} ${r.code}`);
    r = await api(cli, 'PATCH', `mensagens?id=eq.${m1?.id}`, { conteudo: 'editada' });
    check('US10-15', 'US-010', 'autor nao edita mensagem', (r.status === 200 && r.data.length === 0) || r.status === 403, `${r.status} ${JSON.stringify(r.data)}`);
    r = await api(cli, 'DELETE', `mensagens?id=eq.${m1?.id}`);
    check('US10-16', 'US-010', 'autor nao apaga mensagem', (r.status === 200 && r.data.length === 0) || r.status === 403, `${r.status} ${JSON.stringify(r.data)}`);
    r = await api(null, 'GET', `mensagens?select=id&contratacao_id=eq.${c1?.id}`);
    check('US10-17', 'US-010', 'visitante nao le mensagens', (r.status === 200 && r.data.length === 0) || r.status === 401, `${r.status}`);

    // Concluir c1 e conferir que o chat fecha (US-009 c5, US-010 c4)
    r = await updateC(cli, c1?.id, { status: 'concluida' }, '&status=eq.aceita');
    check('US9-06', 'US-009', 'cliente conclui contratacao aceita (c5)', r.data?.[0]?.status === 'concluida', `${r.status} ${r.msg}`);
    const ev3 = await rtP1.esperar((e) => e.type === 'UPDATE' && e.record?.id === c1?.id && e.record?.status === 'concluida');
    check('US9-12', 'US-009', 'Realtime: profissional recebe a conclusao em ate 3s (c5)', !!ev3, 'sem evento');
    r = await updateC(p1, c1?.id, { status: 'aceita' });
    check('US9-13', 'US-009', 'concluida nao tem mais transicao (c5)', r.status >= 400, `${r.status} ${r.msg}`);
    r = await msg(p1, c1?.id, 'depois de concluida');
    check('US10-18', 'US-010', 'nao envia mensagem em concluida (c4, BR08)', r.status === 403, `${r.status} ${r.code}`);
    r = await api(p1, 'GET', `mensagens?select=id&contratacao_id=eq.${c1?.id}`);
    check('US10-19', 'US-010', 'historico continua legivel em concluida (c4)', r.data?.length >= 8, `${r.data?.length}`);

    // Profissional também conclui (outra contratação)
    r = await novaC(cli, p1, { rotulo: 'US-009 prof conclui' });
    const c4 = r.data?.[0];
    await updateC(p1, c4?.id, { status: 'aceita' }, '&status=eq.solicitada');
    r = await updateC(p1, c4?.id, { status: 'concluida' }, '&status=eq.aceita');
    check('US9-14', 'US-009', 'profissional tambem conclui (c5)', r.data?.[0]?.status === 'concluida', `${r.status} ${r.msg}`);

    // Chat em recusada / cancelada
    r = await msg(cli, c2?.id, 'em recusada');
    check('US10-20', 'US-010', 'nao envia em recusada (c4)', r.status === 403, `${r.status}`);
    r = await msg(cli, c3?.id, 'em cancelada');
    check('US10-21', 'US-010', 'nao envia em cancelada (c4)', r.status === 403, `${r.status}`);
    r = await msg(p1, c4?.id, 'oi');
    check('US10-22', 'US-010', 'nao envia em concluida pelo profissional (c4)', r.status === 403, `${r.status}`);

    // Vazamento de Realtime de contratacoes para o terceiro
    const mine = [c1, c2, c3, c4, cForj, cVazia].filter(Boolean).map((c) => c.id);
    const vaz = rtP2.eventos.filter((e) => mine.includes(e.record?.id) || mine.includes(e.old_record?.id));
    check('US8-14', 'US-008', 'Realtime: terceiro nao recebe eventos das contratacoes alheias', vaz.length === 0, `${vaz.length} eventos vazaram`);

    [rtP1, rtCli, rtP2, rtCliMsg, rtP1Msg, rtP2Msg].forEach((x) => x.fechar());

    console.log('Contratacoes criadas:', mine.join(', '));
    process.exitCode = resumo() ? 0 : 1;
}

main().catch((e) => { console.error('ERRO FATAL', e); process.exit(2); });
