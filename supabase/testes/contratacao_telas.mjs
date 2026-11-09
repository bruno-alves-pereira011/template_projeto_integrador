// ===================================================================
// HelpMe — teste das TELAS de US-007 a US-010 no Chrome real (headless)
// ===================================================================
// COMO RODAR (Node 22+, Python 3 e Google Chrome; sem instalar nada):
//   node supabase/testes/contratacao_telas.mjs
// Sobe um servidor estático em helpme-app/ (python -m http.server), abre o
// Chrome em modo headless com contextos ISOLADOS (cada um com seu login,
// como janelas anônimas diferentes) e usa o Supabase REAL.
//   A = visitante que entra como cliente@   B = prof1@ (aprovado)
//   C = prof2@ (terceiro, não é parte das contratações)
// ATENÇÃO: grava no banco real; contratações levam "[TESTE AUTO <data>]".
// Variáveis opcionais: CHROME (caminho do executável), HELPME_SENHA.
// ===================================================================

import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RAIZ, TAG, sleep, login, api, criarRelatorio } from './_supabase.mjs';

const { check, bloqueado, resumo } = criarRelatorio();
const PORTA_HTTP = 8765, PORTA_CDP = 9333;
const BASE = `http://127.0.0.1:${PORTA_HTTP}/`;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const AMANHA = new Date(Date.now() + 86400000).toISOString();
const LIMITE_REALTIME_MS = 3000;

// ---------------- CDP mínimo ----------------
class CDP {
    constructor(wsUrl) {
        this.id = 0; this.pend = new Map(); this.ouvintes = [];
        this.ws = new WebSocket(wsUrl);
        this.pronto = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
        this.ws.onmessage = (m) => {
            const msg = JSON.parse(m.data);
            if (msg.id && this.pend.has(msg.id)) {
                const { res, rej } = this.pend.get(msg.id); this.pend.delete(msg.id);
                msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
            } else if (msg.method) {
                this.ouvintes.forEach((f) => f(msg));
            }
        };
    }
    send(method, params = {}, sessionId) {
        const id = ++this.id;
        this.ws.send(JSON.stringify({ id, method, params, sessionId }));
        return new Promise((res, rej) => this.pend.set(id, { res, rej }));
    }
}

class Aba {
    constructor(cdp, sessionId, nome) {
        this.cdp = cdp; this.s = sessionId; this.nome = nome; this.errosJs = [];
        cdp.ouvintes.push((m) => {
            if (m.sessionId !== this.s) return;
            if (m.method === 'Runtime.exceptionThrown') this.errosJs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
        });
    }
    send(m, p) { return this.cdp.send(m, p, this.s); }
    async ir(caminho) {
        await this.send('Page.navigate', { url: BASE + caminho });
        await this.esperar('document.readyState === "complete"', 10000);
    }
    async js(expr) {
        const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(`[${this.nome}] ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}\n  em: ${expr.slice(0, 120)}`);
        return r.result.value;
    }
    // Espera a expressão ficar verdadeira. Devolve ms gastos ou null (timeout).
    async esperar(expr, ms = 8000) {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
            try { if (await this.js(`!!(${expr})`)) return Date.now() - t0; } catch { /* página trocando */ }
            await sleep(100);
        }
        return null;
    }
    url() { return this.js('location.href'); }
    visivel(sel) { return this.js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; })()`); }
    texto(sel) { return this.js(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`); }
    clicar(sel) { return this.js(`document.querySelector(${JSON.stringify(sel)}).click()`); }
    preencher(sel, valor) {
        return this.js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(valor)};
            e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    }
    async tecla(key, { shift = false } = {}) {
        const codigos = { Enter: 13, Tab: 9 };
        const base = { key, code: key, windowsVirtualKeyCode: codigos[key], modifiers: shift ? 8 : 0 };
        await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key === 'Enter' ? '\r' : undefined });
        await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    }
    // Realtime: todos os canais do supabase-js conectados (+ folga para o postgres_changes)
    async realtimePronto() {
        const ms = await this.esperar('window.supabaseClient && supabaseClient.getChannels().length > 0 && supabaseClient.getChannels().every((c) => c.state === "joined")', 10000);
        await sleep(1200);
        return ms !== null;
    }
    async tela(largura, altura = 800) {
        await this.send('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 600 });
    }
    async offline(sim) {
        await this.send('Network.emulateNetworkConditions', { offline: sim, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
    async logar(email) {
        await this.esperar('document.getElementById("login-form")');
        await this.preencher('#email', email);
        await this.preencher('#senha', process.env.HELPME_SENHA || 'Helpme@123');
        await this.clicar('#btn-login');
        return this.esperar('!location.pathname.endsWith("index.html")', 15000);
    }
}

// ---------------- auditorias de tela (critérios Mobile e Acessibilidade) ----------------
const JS_AUDITORIA = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
  const nome = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + ' "' + (e.textContent || e.value || '').trim().slice(0, 30) + '"';
  const doc = document.documentElement;
  // 1. rolagem horizontal
  const rolagem = { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  // 2. área de toque: botões e links com cara de botão
  const toque = [...document.querySelectorAll('button, a.btn, a.menu-item, a.link-card, .btn, input[type=submit]')]
      .filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { e: nome(e), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((x) => x.h < 44 || x.w < 44);
  const linksTexto = [...document.querySelectorAll('a[href]:not(.btn):not(.menu-item):not(.link-card)')]
      .filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { e: nome(e), h: Math.round(r.height) }; })
      .filter((x) => x.h < 44);
  // 3. campos sem rótulo
  const semRotulo = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')]
      .filter(vis).filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map(nome);
  // 4. contraste de texto (WCAG AA: 4.5, ou 3 para texto grande)
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fundo = (e) => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c; } return [255, 255, 255]; };
  const contraste = [];
  for (const e of document.querySelectorAll('body *')) {
      if (!vis(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const s = getComputedStyle(e); const fg = rgb(s.color); if (fg[3] === 0) continue;
      const bg = fundo(e); const L1 = lum(fg), L2 = lum(bg);
      const razao = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const tam = parseFloat(s.fontSize), negrito = Number(s.fontWeight) >= 700;
      const minimo = (tam >= 24 || (tam >= 18.66 && negrito)) ? 3 : 4.5;
      if (razao < minimo) contraste.push(nome(e) + ' ' + razao.toFixed(2) + ':1');
  }
  return { rolagem, toque, linksTexto, semRotulo, contraste: [...new Set(contraste)] };
})()`;

// Navega com Tab e confere se cada elemento focado tem indicador visível.
async function auditarFoco(aba, maxTabs = 40) {
    // Recomeça a navegação do topo: blur() não reinicia o ponto de partida do Tab no Chrome.
    await aba.js(`(() => { window.scrollTo(0, 0); let m = document.getElementById('inicio-tab');
        if (!m) { m = document.createElement('span'); m.id = 'inicio-tab'; m.tabIndex = -1; document.body.prepend(m); }
        m.focus(); })()`);
    const vistos = [], semFoco = [];
    for (let i = 0; i < maxTabs; i++) {
        await aba.tecla('Tab');
        const info = await aba.js(`(() => { const e = document.activeElement; if (!e || e === document.body) return null;
            const s = getComputedStyle(e);
            const temContorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
            const temSombra = s.boxShadow && s.boxShadow !== 'none';
            return { e: (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' "' + (e.textContent || '').trim().slice(0, 20) + '"', ok: temContorno || temSombra }; })()`);
        if (!info) continue;
        // datetime-local tem sub-campos (dia/mês/ano...): o mesmo elemento em sequência não é volta completa
        if (info.e === vistos[vistos.length - 1]) continue;
        if (vistos.includes(info.e)) break;
        vistos.push(info.e);
        if (!info.ok) semFoco.push(info.e);
    }
    return { vistos, semFoco };
}

async function auditar(aba, rotulo, story, prefixo) {
    await aba.tela(360, 740);
    await sleep(400);
    const a = await aba.js(JS_AUDITORIA);
    check(`${prefixo}-M1`, story, `${rotulo}: sem rolagem horizontal em 360px`, a.rolagem.scrollWidth <= a.rolagem.clientWidth, JSON.stringify(a.rolagem));
    check(`${prefixo}-M2`, story, `${rotulo}: botoes com area de toque >= 44px`, a.toque.length === 0, JSON.stringify(a.toque));
    const f = await auditarFoco(aba);
    await aba.tela(1280, 800);
    check(`${prefixo}-A1`, story, `${rotulo}: campos com label`, a.semRotulo.length === 0, JSON.stringify(a.semRotulo));
    check(`${prefixo}-A2`, story, `${rotulo}: foco visivel em todos os elementos (Tab, ${f.vistos.length} elementos)`, f.semFoco.length === 0 && f.vistos.length > 0, f.semFoco.length ? JSON.stringify(f.semFoco) : f.vistos.join(', '));
    check(`${prefixo}-A3`, story, `${rotulo}: contraste de texto AA`, a.contraste.length === 0, JSON.stringify(a.contraste.slice(0, 8)));
    return a.linksTexto;
}

// ---------------- infraestrutura ----------------
async function subirInfra() {
    const http = spawn('python', ['-m', 'http.server', String(PORTA_HTTP), '--bind', '127.0.0.1', '--directory', join(RAIZ, 'helpme-app')], { stdio: 'ignore' });
    const perfil = mkdtempSync(join(tmpdir(), 'helpme-chrome-'));
    const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
        '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });
    let wsUrl = null;
    for (let i = 0; i < 50 && !wsUrl; i++) {
        await sleep(200);
        try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`)).json()).webSocketDebuggerUrl; } catch { /* subindo */ }
    }
    for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + 'index.html')).ok) break; } catch { /* subindo */ } await sleep(200); }
    if (!wsUrl) throw new Error('Chrome nao abriu a porta de depuracao');
    const cdp = new CDP(wsUrl); await cdp.pronto;
    const fechar = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} setTimeout(() => { try { rmSync(perfil, { recursive: true, force: true }); } catch {} }, 1500); };
    return { cdp, fechar };
}

async function novaAba(cdp, nome) {
    const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const aba = new Aba(cdp, sessionId, nome);
    await aba.send('Page.enable'); await aba.send('Runtime.enable'); await aba.send('Network.enable');
    // confirm() sempre "OK" (Recusar, Cancelar, Concluir pedem confirmação)
    await aba.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = () => true;' });
    await aba.tela(1280, 800);
    return aba;
}

// ===================================================================
async function main() {
    const cli = await login('cliente@helpme.test');
    const p1 = await login('prof1@helpme.test');
    const p2 = await login('prof2@helpme.test');
    const nomeP1 = (await api(null, 'GET', `profissionais_publicos?select=nome&id=eq.${p1.id}`)).data?.[0]?.nome;
    const nomeCli = (await api(cli, 'GET', `usuarios?select=nome,telefone&id=eq.${cli.id}`)).data?.[0];
    const criar = async (rotulo) => (await api(cli, 'POST', 'contratacoes', {
        cliente_id: cli.id, profissional_id: p1.id, descricao: `${TAG} ${rotulo}`, endereco: 'Rua Teste, 10 - Centro', data_desejada: AMANHA,
    })).data?.[0]?.id;
    const status = (u, id, de, para) => api(u, 'PATCH', `contratacoes?id=eq.${id}&status=eq.${de}`, { status: para });
    const qtdContratacoes = async () => (await api(cli, 'GET', 'contratacoes?select=id&cliente_id=eq.' + cli.id)).data.length;
    const cardSel = (id) => `[...document.querySelectorAll('.card-numero')].find((e) => e.textContent.trim() === 'Solicitação nº ${id}')`;
    const grupoDoCard = (id) => `(${cardSel(id)})?.closest('section')?.id`;
    const criadas = [];

    console.log(`Marcador: ${TAG}\nSubindo servidor e Chrome...\n`);
    const { cdp, fechar } = await subirInfra();
    try {
        const A = await novaAba(cdp, 'A-cliente');
        const B = await novaAba(cdp, 'B-prof1');
        const C = await novaAba(cdp, 'C-terceiro');

        // ================= US-007 =================
        await A.ir(`profissional.html?id=${p1.id}`);
        let ms = await A.esperar(`document.querySelector('#acoes-contratacao a')?.textContent.trim() === 'Contratar'`);
        check('UI7-01', 'US-007', 'visitante ve "Contratar" no perfil (c1, CT-01)', ms !== null);

        await C.ir('index.html');
        await C.logar('prof2@helpme.test');
        await C.ir(`profissional.html?id=${p1.id}`);
        await C.esperar(`!document.getElementById('perfil-profissional').hidden`);
        await sleep(2000);
        check('UI7-02', 'US-007', 'profissional logado NAO ve "Contratar" (c1, CT-01)', !(await C.js(`!!document.querySelector('#acoes-contratacao a')`)));

        await A.clicar('#acoes-contratacao a');
        ms = await A.esperar(`location.pathname.endsWith('index.html') && location.search.includes('voltar=')`);
        const urlLogin = await A.url();
        check('UI7-03', 'US-007', 'visitante que clica em Contratar vai ao login com ?voltar= (c2)', ms !== null, urlLogin);
        await A.logar('cliente@helpme.test');
        ms = await A.esperar(`location.pathname.endsWith('solicitar-pedido.html') && location.search.includes('${p1.id}') && document.getElementById('resumo-nome').textContent.trim()`);
        check('UI7-04', 'US-007', 'apos entrar como cliente volta a solicitar-pedido do mesmo profissional (c2, CT-02)', ms !== null, await A.url());
        check('UI7-05', 'US-007', 'resumo mostra o profissional escolhido', (await A.texto('#resumo-nome')) === nomeP1, `${await A.texto('#resumo-nome')} / esperado ${nomeP1}`);

        const antes = await qtdContratacoes();
        await A.clicar('#btn-enviar');
        await sleep(500);
        const errosVazio = await A.js(`['erro-descricao','erro-endereco','erro-data_desejada'].filter((id) => !document.getElementById(id).hidden).length`);
        check('UI7-06', 'US-007', 'enviar vazio mostra erro nos 3 campos (c3, CT-03)', errosVazio === 3, `${errosVazio} erros`);

        await A.preencher('#descricao', `${TAG} US-007 tela`);
        await A.preencher('#endereco', 'Rua das Flores, 100 - Centro, Serra');
        await A.preencher('#data_desejada', '2020-01-01T10:00');
        await A.clicar('#btn-enviar');
        await sleep(500);
        check('UI7-07', 'US-007', 'data no passado mostra erro no campo de data (c3, CT-03)',
            (await A.visivel('#erro-data_desejada')) && !(await A.visivel('#erro-descricao')), await A.texto('#erro-data_desejada'));

        await A.preencher('#descricao', '    ');
        await A.preencher('#data_desejada', '2030-06-10T14:30');
        await A.clicar('#btn-enviar');
        await sleep(500);
        check('UI7-08', 'US-007', 'descricao so com espacos e barrada no formulario (c3)', await A.visivel('#erro-descricao'));
        await sleep(1000);
        check('UI7-09', 'US-007', 'nenhuma contratacao criada pelos envios invalidos (CT-03)', (await qtdContratacoes()) === antes, `${antes} -> ${await qtdContratacoes()}`);

        await A.preencher('#descricao', `${TAG} US-007 tela`);
        await A.clicar('#btn-enviar');
        ms = await A.esperar(`location.pathname.endsWith('espera-cliente.html') && /id=\\d+/.test(location.search)`, 10000);
        const idUI = Number(new URL(await A.url()).searchParams.get('id'));
        if (idUI) criadas.push(idUI);
        check('UI7-10', 'US-007', 'envio valido cria a contratacao e abre espera-cliente.html?id= (c4, CT-04)', ms !== null && idUI > 0, await A.url());
        const linhaUI = (await api(cli, 'GET', `contratacoes?select=status,data_desejada&id=eq.${idUI}`)).data?.[0];
        check('UI7-11', 'US-007', 'contratacao gravada como solicitada com a data escolhida (c4)',
            linhaUI?.status === 'solicitada' && new Date(linhaUI.data_desejada).getTime() === new Date('2030-06-10T14:30').getTime(), JSON.stringify(linhaUI));
        await A.esperar(`!document.getElementById('espera-detalhe').hidden`);
        check('UI7-12', 'US-007', 'espera-cliente mostra "Aguardando o profissional"', (await A.texto('#detalhe-status')) === 'Aguardando o profissional', await A.texto('#detalhe-status'));

        await C.ir(`solicitar-pedido.html?profissional=${p1.id}`);
        await sleep(2500);
        check('UI7-13', 'US-007', 'profissional que abre solicitar-pedido e mandado embora', !(await C.url()).includes('solicitar-pedido'), await C.url());

        await A.ir('solicitar-pedido.html?profissional=00000000-0000-4000-8000-000000000000');
        ms = await A.esperar(`!document.getElementById('contratar-nao-encontrado').hidden`);
        check('UI7-14', 'US-007', 'profissional inexistente mostra "nao disponivel"', ms !== null);

        await A.ir(`solicitar-pedido.html?profissional=${p1.id}`);
        await A.esperar(`!document.getElementById('form-contratar').hidden`);
        const linksUS7 = await auditar(A, 'solicitar-pedido', 'US-007', 'UI7');
        // Autoteste das auditorias: um texto cinza-claro e um botão sem contorno de foco TÊM de ser apontados
        await A.js(`(() => { const p = document.createElement('p'); p.id = 'autoteste-contraste'; p.textContent = 'texto claro demais';
            p.style.cssText = 'color:#cccccc;background:#ffffff'; document.querySelector('main, body').prepend(p);
            const b = document.createElement('button'); b.id = 'autoteste-foco'; b.textContent = 'sem foco'; b.style.cssText = 'outline:none !important;box-shadow:none !important;min-height:20px';
            document.querySelector('main, body').prepend(b); })()`);
        const auto = await A.js(JS_AUDITORIA);
        const autoFoco = await auditarFoco(A);
        check('AUTO-1', 'infra', 'autoteste: auditoria detecta contraste ruim, botao pequeno e foco invisivel',
            auto.contraste.some((x) => x.includes('autoteste-contraste')) && auto.toque.some((x) => x.e.includes('autoteste-foco')) && autoFoco.semFoco.some((x) => x.includes('autoteste-foco')),
            JSON.stringify({ c: auto.contraste.slice(0, 2), t: auto.toque.slice(0, 2), f: autoFoco.semFoco }));

        // ================= US-008 =================
        await B.ir('index.html');
        await B.logar('prof1@helpme.test');
        ms = await B.esperar(`location.pathname.endsWith('contratacoes.html') && document.getElementById('titulo-pagina').textContent === 'Contratações recebidas'`);
        check('UI8-01', 'US-008', 'login do profissional aprovado leva a "Contratacoes recebidas"', ms !== null, await B.url());
        await B.esperar(cardSel(idUI));
        const card = await B.js(`(() => { const c = (${cardSel(idUI)}).closest('.card-pedido');
            return { grupo: ${grupoDoCard(idUI)}, desc: c.querySelector('.card-descricao')?.textContent, end: c.querySelector('.texto-endereco')?.textContent, data: c.querySelector('.card-data')?.textContent }; })()`);
        check('UI8-02', 'US-008', 'card na lista "Aguardando sua resposta" com descricao, endereco e data (c1, AC-01)',
            card.grupo === 'grupo-solicitadas' && card.desc?.includes('US-007 tela') && card.end && card.data?.startsWith('Para:'), JSON.stringify(card));
        check('UI8-03', 'US-008', 'link "Editar meu perfil" visivel (c6, AC-07)', await B.visivel('#menu-editar-perfil'), await B.js(`document.getElementById('menu-editar-perfil')?.getAttribute('href')`));

        await B.realtimePronto();
        const t0 = Date.now();
        const idRt = await criar('US-008 realtime'); criadas.push(idRt);
        ms = await B.esperar(cardSel(idRt), 8000);
        check('UI8-04', 'US-008', 'nova solicitacao aparece sem recarregar (c3, AC-02)', ms !== null && Date.now() - t0 <= LIMITE_REALTIME_MS + 500, `${Date.now() - t0} ms`);

        // A acompanha em espera-cliente enquanto B aceita (US-009 c2 / AP-02)
        await A.ir(`espera-cliente.html?id=${idUI}`);
        await A.esperar(`!document.getElementById('espera-detalhe').hidden`);
        await A.realtimePronto();
        await B.clicar(`[aria-label="Aceitar a solicitação nº ${idUI}"]`);
        ms = await B.esperar(`${grupoDoCard(idUI)} === 'grupo-aceitas'`);
        check('UI8-05', 'US-008', 'Aceitar move o card para "Aceitas" (c2, AC-03)', ms !== null, await B.texto('#contratacoes-aviso'));
        ms = await A.esperar(`location.pathname.endsWith('servico-andamento.html')`, 6000);
        check('UI9-01', 'US-009', 'espera-cliente vai sozinha para servico-andamento quando o profissional aceita (c2, AP-02)', ms !== null, await A.url());

        await B.clicar(`[aria-label="Recusar a solicitação nº ${idRt}"]`);
        ms = await B.esperar(`${grupoDoCard(idRt)} === 'grupo-encerradas'`);
        check('UI8-06', 'US-008', 'Recusar move o card para "Encerradas" (c2, AC-03)', ms !== null);

        // Corrida: cliente cancela e o profissional clica Aceitar na lista desatualizada (c4, AC-04)
        const idCorrida = await criar('US-008 corrida'); criadas.push(idCorrida);
        await B.esperar(cardSel(idCorrida), 8000);
        await B.js('supabaseClient.removeAllChannels()'); // lista "congelada", como sem rede
        await status(cli, idCorrida, 'solicitada', 'cancelada');
        await B.clicar(`[aria-label="Aceitar a solicitação nº ${idCorrida}"]`);
        ms = await B.esperar(`document.getElementById('contratacoes-aviso').textContent.includes('foi cancelada')`);
        check('UI8-07', 'US-008', 'aceitar depois do cancelamento mostra "Esta solicitacao foi cancelada" (c4, AC-04)', ms !== null, await B.texto('#contratacoes-aviso'));
        ms = await B.esperar(`${grupoDoCard(idCorrida)} === 'grupo-encerradas'`);
        check('UI8-08', 'US-008', 'e a lista recarrega com o card em "Encerradas" (c4)', ms !== null);
        const linhaCorrida = (await api(cli, 'GET', `contratacoes?select=status&id=eq.${idCorrida}`)).data?.[0]?.status;
        check('UI8-09', 'US-008', 'status no banco continua cancelada', linhaCorrida === 'cancelada', linhaCorrida);

        await B.ir('contratacoes.html');
        await B.esperar(cardSel(idUI));
        const linksUS8 = await auditar(B, 'contratacoes (profissional)', 'US-008', 'UI8');

        // ================= US-009 =================
        await A.esperar(`!document.getElementById('servico-detalhe').hidden`);
        const visaoCli = await A.js(`({ nome: document.getElementById('detalhe-outra-parte').textContent.trim(),
            tel: document.getElementById('btn-ligar').getAttribute('href'), zap: document.getElementById('btn-whatsapp').getAttribute('href'),
            telVis: !document.getElementById('btn-ligar').hidden, zapVis: !document.getElementById('btn-whatsapp').hidden })`);
        check('UI9-02', 'US-009', 'cliente ve nome, Ligar (tel:) e WhatsApp (wa.me) do profissional apos aceite (c4, AP-05)',
            visaoCli.nome === nomeP1 && /^tel:\+?\d+$/.test(visaoCli.tel || '') && /^https:\/\/wa\.me\/\d+/.test(visaoCli.zap || '') && visaoCli.telVis && visaoCli.zapVis, JSON.stringify(visaoCli));

        // Antes do aceite: o profissional so ve o primeiro nome (AP-04) — chat de uma solicitada
        const idAntes = await criar('US-009 antes do aceite'); criadas.push(idAntes);
        await B.ir(`contratacao.html?id=${idAntes}`);
        await B.esperar(`!document.getElementById('chat-detalhe').hidden`);
        const nomeAntes = await B.texto('#detalhe-outra-parte');
        const telNaPagina = nomeCli?.telefone ? await B.js(`document.body.innerText.includes(${JSON.stringify(nomeCli.telefone)})`) : false;
        check('UI9-03', 'US-009', 'antes do aceite o profissional ve so o primeiro nome do cliente, sem telefone (c4, AP-04)',
            nomeAntes && !/\s/.test(nomeAntes) && !telNaPagina && (nomeCli?.nome || '').startsWith(nomeAntes), `"${nomeAntes}" (completo: "${nomeCli?.nome}")`);

        await B.ir(`servico-andamento.html?id=${idUI}`);
        await B.esperar(`!document.getElementById('servico-detalhe').hidden`);
        const visaoProf = await B.js(`({ nome: document.getElementById('detalhe-outra-parte').textContent.trim(),
            tel: document.getElementById('btn-ligar').getAttribute('href'), zap: document.getElementById('btn-whatsapp').getAttribute('href') })`);
        check('UI9-04', 'US-009', 'depois do aceite o profissional ve nome completo, Ligar e WhatsApp do cliente (c4, AP-05)',
            visaoProf.nome === nomeCli?.nome && (!nomeCli?.telefone || (/^tel:/.test(visaoProf.tel || '') && /wa\.me/.test(visaoProf.zap || ''))), JSON.stringify(visaoProf));

        // Lista do cliente atualiza sozinha (c1, AP-01)
        await A.ir('contratacoes.html');
        await A.esperar(`document.getElementById('titulo-pagina').textContent === 'Minhas contratações' && ${cardSel(idAntes)}`);
        check('UI9-05', 'US-009', 'cliente ve "Minhas contratacoes" com as proprias contratacoes (c1)', await A.js(`${grupoDoCard(idAntes)} === 'grupo-solicitadas'`));
        await A.realtimePronto();
        const t1 = Date.now();
        await status(p1, idAntes, 'solicitada', 'aceita');
        ms = await A.esperar(`${grupoDoCard(idAntes)} === 'grupo-aceitas'`, 8000);
        check('UI9-06', 'US-009', 'status muda na lista do cliente sem recarregar (c1, AP-01)', ms !== null && Date.now() - t1 <= LIMITE_REALTIME_MS + 500, `${Date.now() - t1} ms`);

        // Cancelar (c3, AP-03)
        const idCancel = await criar('US-009 cancelar'); criadas.push(idCancel);
        await A.ir(`espera-cliente.html?id=${idCancel}`);
        await A.esperar(`!document.getElementById('espera-detalhe').hidden`);
        check('UI9-07', 'US-009', 'botao Cancelar visivel enquanto solicitada', await A.visivel('#btn-cancelar'));
        await A.clicar('#btn-cancelar');
        ms = await A.esperar(`document.getElementById('detalhe-status').textContent === 'Cancelada por você' && document.getElementById('btn-cancelar').hidden`);
        check('UI9-08', 'US-009', 'cancelar muda para "Cancelada por voce" e o botao some (c3, AP-03)', ms !== null, await A.texto('#detalhe-status'));

        // Terceiro (c6, AP-07)
        for (const pag of ['espera-cliente', 'servico-andamento']) {
            await C.ir(`${pag}.html?id=${idUI}`);
            ms = await C.esperar(`!document.getElementById('${pag === 'espera-cliente' ? 'espera' : 'servico'}-nao-encontrada').hidden`);
            check(`UI9-09-${pag}`, 'US-009', `terceiro em ${pag}.html ve "Contratacao nao encontrada" (c6, AP-07)`, ms !== null, await C.url());
        }

        // home do cliente tem "Minhas contratações"
        await A.ir('home-cliente.html');
        ms = await A.esperar(`!document.getElementById('link-minhas-contratacoes').hidden`);
        check('UI9-10', 'US-009', 'menu do cliente tem "Minhas contratacoes"', ms !== null);

        // auditorias US-009 (espera e servico)
        const idAudit = await criar('US-009 auditoria espera'); criadas.push(idAudit);
        await A.ir(`espera-cliente.html?id=${idAudit}`);
        await A.esperar(`!document.getElementById('espera-detalhe').hidden`);
        const linksUS9a = await auditar(A, 'espera-cliente', 'US-009', 'UI9e');
        await A.ir(`servico-andamento.html?id=${idAntes}`);
        await A.esperar(`!document.getElementById('servico-detalhe').hidden`);
        const linksUS9b = await auditar(A, 'servico-andamento', 'US-009', 'UI9s');
        await A.ir('contratacoes.html');
        await A.esperar(cardSel(idAntes));
        await auditar(A, 'contratacoes (cliente)', 'US-009', 'UI9l');

        // ================= US-010 (chat em idUI, que esta aceita) =================
        await A.ir(`contratacao.html?id=${idUI}`);
        await B.ir(`contratacao.html?id=${idUI}`);
        await A.esperar(`!document.getElementById('chat-detalhe').hidden`);
        await B.esperar(`!document.getElementById('chat-detalhe').hidden`);
        await A.realtimePronto(); await B.realtimePronto();
        const textosLista = `[...document.querySelectorAll('#chat-lista .chat-msg-texto')].map((e) => e.textContent)`;
        const temMsg = (t) => `[...document.querySelectorAll('#chat-lista .chat-msg-texto')].some((e) => e.textContent === ${JSON.stringify(t)})`;
        const enviarPelaTela = async (aba, texto) => { await aba.preencher('#chat-texto', texto); await aba.clicar('#btn-enviar'); };

        let t = Date.now();
        await enviarPelaTela(A, 'teste 1');
        ms = await B.esperar(temMsg('teste 1'), 8000);
        check('UI10-01', 'US-010', 'mensagem de A aparece em B sem recarregar em ate 3s (c2, CH-01)', ms !== null && Date.now() - t <= LIMITE_REALTIME_MS, `${Date.now() - t} ms`);
        t = Date.now();
        await enviarPelaTela(B, 'teste 2');
        ms = await A.esperar(temMsg('teste 2'), 8000);
        check('UI10-02', 'US-010', 'resposta de B aparece em A em ate 3s (c2, CH-02)', ms !== null && Date.now() - t <= LIMITE_REALTIME_MS, `${Date.now() - t} ms`);

        for (let i = 1; i <= 5; i++) { await enviarPelaTela(i % 2 ? A : B, `seq ${i}`); await sleep(300); }
        await A.esperar(temMsg('seq 5'), 8000); await B.esperar(temMsg('seq 5'), 8000); await sleep(800);
        const la = await A.js(textosLista), lb = await B.js(textosLista);
        const seqA = la.filter((x) => x.startsWith('seq ')), seqB = lb.filter((x) => x.startsWith('seq '));
        check('UI10-03', 'US-010', '5 mensagens alternadas: nenhuma falta, nenhuma duplicada, mesma ordem (c2, CH-03)',
            seqA.join() === 'seq 1,seq 2,seq 3,seq 4,seq 5' && seqB.join() === seqA.join() && la.join('|') === lb.join('|'), `A: ${seqA} / B: ${seqB}`);

        await A.ir(`contratacao.html?id=${idUI}`); await B.ir(`contratacao.html?id=${idUI}`);
        await A.esperar(temMsg('seq 5')); await B.esperar(temMsg('seq 5'));
        const autores = await A.js(`[...document.querySelectorAll('#chat-lista > *')].map((li) => [li.querySelector('.chat-msg-autor').textContent, li.querySelector('.chat-msg-texto').textContent, li.querySelector('.chat-msg-hora').textContent])`);
        const okAutores = autores.every(([autor, txt, hora]) => hora && (['teste 1', 'seq 1', 'seq 3', 'seq 5'].includes(txt) ? autor === 'Você' : ['teste 2', 'seq 2', 'seq 4'].includes(txt) ? autor === nomeP1 : true));
        check('UI10-04', 'US-010', 'apos F5: mesmo historico, "Voce" nas proprias, nome da outra parte nas demais, com horario (c1, CH-04)',
            (await A.js(textosLista)).join('|') === la.join('|') && okAutores, JSON.stringify(autores.slice(0, 3)));

        await enviarPelaTela(A, '<b>oi</b>');
        await B.esperar(temMsg('<b>oi</b>'), 8000);
        const html = await Promise.all([A, B].map((x) => x.js(`!!document.querySelector('#chat-lista b')`)));
        check('UI10-05', 'US-010', '<b>oi</b> aparece como texto literal nas duas janelas (c5, CH-05)', (await B.js(temMsg('<b>oi</b>'))) && !html[0] && !html[1]);

        const estadoBotao = async (txt) => { await A.preencher('#chat-texto', txt); return A.js(`({ desab: document.getElementById('btn-enviar').disabled, cont: document.getElementById('chat-contador').textContent })`); };
        const vazio = await estadoBotao(''), espacos = await estadoBotao('     '), longo = await estadoBotao('a'.repeat(1001));
        check('UI10-06', 'US-010', '"Enviar" desabilitado com campo vazio, so espacos e 1001 caracteres (c3, CH-06)', vazio.desab && espacos.desab && longo.desab, JSON.stringify({ vazio, espacos, longo }));
        check('UI10-07', 'US-010', 'contador mostra 1001/1000 com aviso de texto longo (c3, CH-06)', /^1001\/1000.*longa/.test(longo.cont), longo.cont);
        const mil = await estadoBotao('b'.repeat(1000));
        await A.clicar('#btn-enviar');
        ms = await A.esperar(`document.getElementById('chat-contador').textContent === '0/1000' && ${temMsg('b'.repeat(1000))}`);
        check('UI10-08', 'US-010', '1000 caracteres: envia e o contador volta a 0/1000 (c3, CH-07)', !mil.desab && ms !== null, mil.cont);

        // Teclado: Shift+Enter quebra linha, Enter envia (CH-18)
        await A.js(`document.getElementById('chat-texto').focus()`);
        await A.send('Input.insertText', { text: 'linha um' });
        await A.tecla('Enter', { shift: true });
        await A.send('Input.insertText', { text: 'linha dois' });
        const valorTeclado = await A.js(`document.getElementById('chat-texto').value`);
        await A.tecla('Enter');
        ms = await A.esperar(temMsg('linha um\nlinha dois'));
        check('UI10-09', 'US-010', 'Shift+Enter quebra linha e Enter envia (c8, CH-18)', valorTeclado === 'linha um\nlinha dois' && ms !== null, JSON.stringify(valorTeclado));

        // Offline (CH-14) e reconexão (CH-15)
        await A.offline(true);
        await A.preencher('#chat-texto', 'mensagem offline');
        await A.clicar('#btn-enviar');
        ms = await A.esperar(`!document.getElementById('chat-aviso').hidden && document.getElementById('chat-aviso').textContent.includes('Sem conexão')`, 15000);
        const ficou = await A.js(`document.getElementById('chat-texto').value`);
        check('UI10-10', 'US-010', 'sem internet: aviso de sem conexao e o texto continua no campo (CH-14)', ms !== null && ficou === 'mensagem offline', `${await A.texto('#chat-aviso')} | campo: "${ficou}"`);
        await A.offline(false);
        await sleep(1000);
        await enviarPelaTela(B, 'enviada durante a reconexao');
        let porRealtime = await A.esperar(temMsg('enviada durante a reconexao'), 15000);
        let caminho = 'Realtime';
        if (porRealtime === null) {
            caminho = 'troca de aba';
            await A.js(`document.dispatchEvent(new Event('visibilitychange'))`);
            porRealtime = await A.esperar(temMsg('enviada durante a reconexao'), 5000);
        }
        check('UI10-11', 'US-010', 'apos reconectar a mensagem aparece (Realtime ou ao voltar para a aba) (CH-15)', porRealtime !== null, `via ${caminho}`);

        // 360px com mensagem longa sem espacos (CH-16) + auditorias
        await enviarPelaTela(B, 'x'.repeat(400));
        await A.esperar(temMsg('x'.repeat(400)), 8000);
        await A.tela(360, 740); await sleep(400);
        const rol = await A.js(`({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })`);
        check('UI10-12', 'US-010', 'mensagem longa sem espacos nao cria rolagem horizontal em 360px (c7, CH-16)', rol.sw <= rol.cw, JSON.stringify(rol));
        await A.tela(1280, 800);
        const linksUS10 = await auditar(A, 'contratacao (chat)', 'US-010', 'UI10');
        const rotulo = await A.js(`document.getElementById('chat-texto').labels[0]?.textContent.trim()`);
        check('UI10-13', 'US-010', 'campo do chat tem label "Sua mensagem" (c8, CH-18)', rotulo === 'Sua mensagem', rotulo);

        // Terceiro (c6, CH-11)
        await C.ir(`contratacao.html?id=${idUI}`);
        ms = await C.esperar(`!document.getElementById('chat-nao-encontrada').hidden`);
        check('UI10-14', 'US-010', 'terceiro ve "Contratacao nao encontrada" e nenhuma mensagem (c6, CH-11)',
            ms !== null && (await C.js(`document.querySelectorAll('#chat-lista > *').length`)) === 0);
        const consoleTerceiro = await C.js(`(async () => {
            const s = await supabaseClient.from('mensagens').select('*').eq('contratacao_id', ${idUI});
            const { data: { user } } = await supabaseClient.auth.getUser();
            const i = await supabaseClient.from('mensagens').insert({ contratacao_id: ${idUI}, autor_id: user.id, conteudo: 'invasao' });
            return { sel: s.data, selErr: s.error?.code, insErr: i.error?.code };
        })()`);
        check('UI10-15', 'US-010', 'console do terceiro: select [] e insert 42501 (c6, CH-12)',
            Array.isArray(consoleTerceiro.sel) && consoleTerceiro.sel.length === 0 && consoleTerceiro.insErr === '42501', JSON.stringify(consoleTerceiro));

        // Encerrar com as duas janelas abertas (c4, CH-08)
        await A.ir(`contratacao.html?id=${idUI}`); await B.ir(`contratacao.html?id=${idUI}`);
        await A.esperar(`!document.getElementById('chat-detalhe').hidden`); await B.esperar(`!document.getElementById('chat-detalhe').hidden`);
        await A.realtimePronto(); await B.realtimePronto();
        const qtdAntes = await A.js(`document.querySelectorAll('#chat-lista > *').length`);
        t = Date.now();
        await status(cli, idUI, 'aceita', 'concluida');
        const fechado = `document.getElementById('chat-texto').disabled && document.getElementById('btn-enviar').disabled && !document.getElementById('chat-encerrado').hidden`;
        const [fa, fb] = await Promise.all([A.esperar(fechado, 8000), B.esperar(fechado, 8000)]);
        check('UI10-16', 'US-010', 'ao concluir, o campo desabilita nas duas janelas sem recarregar (c4, CH-08)', fa !== null && fb !== null, `A ${fa} ms, B ${fb} ms`);
        check('UI10-17', 'US-010', 'historico continua visivel apos concluir (c4, CH-08)', (await A.js(`document.querySelectorAll('#chat-lista > *').length`)) === qtdAntes, `${qtdAntes} mensagens`);

        // recusada e cancelada, como cliente e profissional (c4, CH-09)
        for (const [id, st] of [[idRt, 'recusada'], [idCorrida, 'cancelada']]) {
            for (const aba of [A, B]) {
                await aba.ir(`contratacao.html?id=${id}`);
                await aba.esperar(`!document.getElementById('chat-detalhe').hidden`);
                const ok = await aba.js(`${fechado} && document.getElementById('chat-encerrado').textContent.includes('${st === 'recusada' ? 'recusada' : 'cancelada'}')`);
                check(`UI10-18-${st}-${aba.nome}`, 'US-010', `chat em ${st} (${aba.nome}): campo desabilitado e aviso de encerrada (c4, CH-09)`, ok);
            }
        }

        // D9: profissional abre o chat pela lista (CH-10)
        const idD9 = await criar('US-010 D9'); criadas.push(idD9);
        await B.ir('contratacoes.html');
        await B.esperar(cardSel(idD9));
        const links = await B.js(`(() => { const achar = (id) => [...document.querySelectorAll('.card-numero')].find((e) => e.textContent.trim() === 'Solicitação nº ' + id)?.closest('.card-pedido')?.querySelector('a[href^="contratacao.html"]');
            const a = achar(${idD9}), b = achar(${idRt}); return [a?.textContent, a?.getAttribute('href'), b?.textContent, b?.getAttribute('href')]; })()`);
        check('UI10-19', 'US-010', '"Conversar" em solicitada e "Ver conversa" em recusada na lista do profissional (D9, CH-10)',
            links[0] === 'Conversar' && links[1] === `contratacao.html?id=${idD9}` && links[2] === 'Ver conversa' && links[3] === `contratacao.html?id=${idRt}`, JSON.stringify(links));
        await B.ir(links[1]);
        ms = await B.esperar(`!document.getElementById('chat-detalhe').hidden`);
        const voltar = await B.js(`document.getElementById('link-voltar').getAttribute('href')`);
        check('UI10-20', 'US-010', 'chat abre e "Voltar" leva para a lista (D9, CH-10)', ms !== null && voltar === 'contratacoes.html', voltar);

        // US-009 c5 pela tela: concluir com as duas abertas (AP-06)
        await A.ir(`servico-andamento.html?id=${idAntes}`); await B.ir(`servico-andamento.html?id=${idAntes}`);
        await A.esperar(`!document.getElementById('servico-detalhe').hidden`); await B.esperar(`!document.getElementById('servico-detalhe').hidden`);
        await A.realtimePronto(); await B.realtimePronto();
        await B.clicar('#btn-concluir');
        const concluida = `document.getElementById('detalhe-status').textContent === 'Concluída' && document.getElementById('btn-concluir').hidden`;
        const [ca, cb] = await Promise.all([A.esperar(concluida, 8000), B.esperar(concluida, 8000)]);
        check('UI9-11', 'US-009', 'profissional conclui; as duas telas atualizam e nao ha mais acoes (c5, AP-06)', ca !== null && cb !== null, `A ${ca} ms, B ${cb} ms`);

        // Erros de JavaScript nas páginas
        const erros = [A, B, C].flatMap((x) => x.errosJs.map((e) => `${x.nome}: ${String(e).split('\n')[0]}`));
        check('UI-JS', 'todas', 'nenhum erro de JavaScript nao tratado nas paginas', erros.length === 0, JSON.stringify(erros.slice(0, 5)));

        const todosLinks = [...linksUS7, ...linksUS8, ...linksUS9a, ...linksUS9b, ...linksUS10];
        if (todosLinks.length) console.log('\n[info] links de texto com menos de 44px de altura (fora da regra de botao):', JSON.stringify([...new Set(todosLinks.map((l) => `${l.e} ${l.h}px`))]));
    } finally {
        console.log('Contratacoes criadas:', criadas.join(', '));
        fechar();
    }

    // ================= estático: NFR01 (c8/c9) =================
    const arquivos = readdirSync(join(RAIZ, 'helpme-app', 'js')).map((f) => join(RAIZ, 'helpme-app', 'js', f))
        .concat(readdirSync(join(RAIZ, 'helpme-app')).filter((f) => f.endsWith('.html')).map((f) => join(RAIZ, 'helpme-app', f)));
    const jwts = arquivos.flatMap((f) => readFileSync(f, 'utf8').match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) || []);
    const papeis = jwts.map((j) => JSON.parse(Buffer.from(j.split('.')[1], 'base64url').toString()).role);
    check('NFR01-1', 'todas', 'nenhuma chave service_role no front (so anon)', papeis.length > 0 && papeis.every((p) => p === 'anon'), papeis.join());
    const cfg = readFileSync(join(RAIZ, 'helpme-app', 'js', 'supabase-config.js'), 'utf8');
    check('NFR01-2', 'todas', 'MODO_DEMONSTRACAO = false', /const MODO_DEMONSTRACAO = false;/.test(cfg));
    const fluxo = ['solicitar-pedido', 'contratacoes', 'espera-cliente', 'servico-andamento', 'contratacao-comum', 'chat'];
    const usoDemo = fluxo.filter((f) => /MODO_DEMONSTRACAO|dadosFicticios|mock|DEMO_/i.test(readFileSync(join(RAIZ, 'helpme-app', 'js', f + '.js'), 'utf8')));
    check('NFR01-3', 'todas', 'scripts do fluxo de contratacao nao usam dados fixos/demo', usoDemo.length === 0, usoDemo.join());

    process.exitCode = resumo() ? 0 : 1;
}

main().catch((e) => { console.error('ERRO FATAL', e); process.exit(2); });
