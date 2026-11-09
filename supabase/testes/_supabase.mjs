// Acesso comum ao Supabase real para os scripts de teste (sem dependências).
// Lê URL e chave PÚBLICA (anon) de helpme-app/js/supabase-config.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cfg = readFileSync(join(RAIZ, 'helpme-app', 'js', 'supabase-config.js'), 'utf8');
export const URL = cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
export const KEY = cfg.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];
export const SENHA = process.env.HELPME_SENHA || 'Helpme@123';
// Marca toda contratação criada pelos testes. Limpeza (SQL Editor):
//   delete from public.contratacoes where descricao like '[TESTE AUTO%';
export const TAG = `[TESTE AUTO ${new Date().toISOString().slice(0, 16)}]`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function login(email) {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: SENHA }),
    });
    const j = await r.json();
    if (!j.access_token) throw new Error(`login ${email}: ${JSON.stringify(j)}`);
    return { token: j.access_token, id: j.user.id, email };
}

// u = usuário logado (ou null para visitante/anon)
export async function api(u, method, path, body, extra = {}) {
    const headers = { apikey: KEY, 'content-type': 'application/json', Prefer: 'return=representation', ...extra };
    headers.Authorization = `Bearer ${u ? u.token : KEY}`;
    const r = await fetch(`${URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: r.status, data, code: data && data.code, msg: data && data.message };
}

// Registro de resultados: PASSOU / FALHOU / BLOQUEADO (ambiente não permite testar)
export function criarRelatorio() {
    const resultados = [];
    function check(id, story, nome, ok, detalhe = '') {
        resultados.push({ id, story, nome, estado: ok ? 'PASSOU' : 'FALHOU', detalhe });
        console.log(`${ok ? 'PASSOU' : 'FALHOU'} ${id} [${story}] ${nome}${ok ? (detalhe ? '  (' + detalhe + ')' : '') : '  -> ' + detalhe}`);
    }
    function bloqueado(id, story, nome, motivo) {
        resultados.push({ id, story, nome, estado: 'BLOQUEADO', detalhe: motivo });
        console.log(`BLOQUEADO ${id} [${story}] ${nome}  -> ${motivo}`);
    }
    function resumo() {
        const n = (e) => resultados.filter((x) => x.estado === e).length;
        console.log(`\n${n('PASSOU')} passaram, ${n('FALHOU')} falharam, ${n('BLOQUEADO')} bloqueados (de ${resultados.length})`);
        return n('FALHOU') === 0;
    }
    return { check, bloqueado, resumo, resultados };
}
