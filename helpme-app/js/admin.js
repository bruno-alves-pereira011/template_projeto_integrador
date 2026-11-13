// ÁREA ADMINISTRATIVA — PAINEL (admin.js) — US-014
// OBJETIVO: proteger admin.html e mostrar a casca da área admin.
// DEPENDE DE (nesta ordem): CDN supabase-js -> js/supabase-config.js -> js/sessao.js.
// SEGURANÇA: esconder a tela é só conveniência. O que protege os dados é o banco
// (RLS + eh_admin()); as telas que leem dados de admin chegam na US-015.

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    function mostrarEstado(estado) {
        el('admin-carregando').hidden = estado !== 'carregando';
        el('admin-erro').hidden = estado !== 'erro';
        el('admin-conteudo').hidden = estado !== 'conteudo';
    }

    // "Ana Paula Rocha" -> "Ana"
    function primeiroNome(nome) {
        return (nome || '').trim().split(/\s+/)[0];
    }

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
        }
    }

    el('btn-tentar-novamente').addEventListener('click', carregar);
    el('btn-sair').addEventListener('click', sair);

    carregar();
})();
