// TELEFONE (telefone.js)
// OBJETIVO: Normalizar números de telefone e montar os links "Ligar" (tel:) e "WhatsApp" (wa.me).
// POR QUÊ: o mesmo número aparece digitado de vários jeitos ("(11) 97777-0001", "+55 11 97777-0001",
// "5511977770001"). Centralizar aqui garante o mesmo link em todas as telas (US-003 e, depois, US-009).
// COMO USAR: script clássico (sem type="module"), carregado antes do script da página.
// API PÚBLICA (globais): normalizarTelefone(str), linkTel(str), linkWhatsApp(str).
// Não depende do Supabase nem do DOM.


// Devolve só os dígitos do número com DDD (10 ou 11 dígitos), sem o código do país 55.
// Exemplos:
//   normalizarTelefone('(11) 97777-0001')    -> '11977770001'
//   normalizarTelefone('+55 11 97777-0001')  -> '11977770001'
//   normalizarTelefone('5511977770001')      -> '11977770001'
//   normalizarTelefone('97777-0001')         -> null   (sem DDD: menos de 10 dígitos)
//   normalizarTelefone(null)                 -> null
// Retorna null quando o número é inválido: ausente, com menos de 10 dígitos ou com mais de 11
// dígitos depois de tirar o 55 (não existe número brasileiro assim).
function normalizarTelefone(numero) {
    if (typeof numero !== 'string' && typeof numero !== 'number') return null;

    let digitos = String(numero).replace(/\D/g, '');

    // Com o código do país vem 12 (fixo) ou 13 (celular) dígitos começando por 55
    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
        digitos = digitos.slice(2);
    }

    if (digitos.length < 10 || digitos.length > 11) return null;

    return digitos;
}


// Link para o botão "Ligar": 'tel:11977770001' (ou null se o número for inválido)
function linkTel(numero) {
    const digitos = normalizarTelefone(numero);
    return digitos ? `tel:${digitos}` : null;
}


// Link para o botão "WhatsApp": 'https://wa.me/5511977770001' (ou null se o número for inválido)
function linkWhatsApp(numero) {
    const digitos = normalizarTelefone(numero);
    return digitos ? `https://wa.me/55${digitos}` : null;
}


// Permite testar estas funções puras no Node (no navegador `module` não existe e isto é ignorado)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizarTelefone, linkTel, linkWhatsApp };
}
