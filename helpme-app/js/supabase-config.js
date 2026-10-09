// CONFIGURAÇÃO DO SUPABASE (supabase-config.js)
// OBJETIVO: ÚNICA fonte de configuração do app (URL, chave pública e modo demonstração).
// COMO USAR: em TODAS as páginas, carregar como script clássico (sem type="module"), nesta ordem:
//   1. CDN @supabase/supabase-js@2
//   2. js/supabase-config.js   (este arquivo)
//   3. js/categorias.js        (só nas páginas que mostram categorias)
//   4. script da página        (auth.js, cliente.js, profissional.js...)
// Os outros scripts usam a variável global `supabaseClient` criada aqui.
// Por isso NINGUÉM mais pode declarar SUPABASE_URL, supabaseClient ou `supabase`:
// redeclarar um `const` global entre scripts clássicos gera SyntaxError e a página para.


// 1. URL do projeto Supabase (termina em .supabase.co, e não .com)
const SUPABASE_URL = 'https://btjjbtjxcbvswgezpwgc.supabase.co';

// 2. Chave pública (anon). Ela PODE ficar no front porque o banco é protegido pelo RLS.
//    Nunca coloquem a chave "service_role" aqui: ela ignora o RLS e daria acesso total ao banco.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ampidGp4Y2J2c3dnZXpwd2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODYyMjIsImV4cCI6MjEwNDk2MjIyMn0.fgGA99SxR7pYcsg2Ezr6EKyi4PzelHaKP5Z-tcaWgn4';

// 3. Modo demonstração: fica num lugar só para ninguém esquecer um `true` perdido em outro arquivo.
//    false = o app sempre usa os dados reais do Supabase.
const MODO_DEMONSTRACAO = false;

// 4. Cria o cliente do banco. Se o CDN não carregou (sem internet), fica null em vez de
//    quebrar a página inteira: assim as telas conseguem mostrar uma mensagem de erro amigável.
const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabaseClient) {
    console.error('A biblioteca do Supabase não carregou (CDN). Verifique a conexão com a internet.');
}

// `const` global não vira propriedade de window; expomos explicitamente para quem preferir window.supabaseClient.
window.supabaseClient = supabaseClient;
window.MODO_DEMONSTRACAO = MODO_DEMONSTRACAO;
