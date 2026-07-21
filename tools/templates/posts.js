/* ===== FONTE ÚNICA DE VERDADE DAS MATÉRIAS DO BLOG =====
 * A página de índice (/blog/) e os "relacionados" de cada artigo são
 * renderizados a partir deste array. Quando o admin panel dinâmico entrar
 * (fase futura), basta ele servir este mesmo formato (JSON) — a camada de
 * apresentação não muda.
 *
 * Campos por post:
 *   slug       identificador na URL: /blog/<slug>/
 *   titulo     título da matéria
 *   categoria  uma de: 'Financiamento' | 'Home Equity' | 'Consórcio' | 'Imóveis'
 *   rotulo     texto curto sobre a imagem do card (ex.: 'Garantia de imóvel')
 *   data       data de publicação no formato dd-mm-yyyy
 *   resumo     chamada exibida no card
 *   imagem     caminho da imagem principal (card + topo do artigo)
 *   destaque   true na matéria em destaque (última publicação em linha única)
 *
 * ORDEM: mais recente no topo. O primeiro item com destaque:true vira a
 * matéria em destaque; o restante entra na grade.
 *
 * Gerado por `npm run blog:gerar` a partir de content/blog/*.md — não editar à mão.
 */
window.BLOG_POSTS = [
{{lista_posts}}
];

/* Config de categorias: cor do rótulo e LP de destino do CTA. */
window.BLOG_CATEGORIAS = {
  'Financiamento': { cor: 'var(--jade)',    lp: '/financiamento/' },
  'Home Equity':   { cor: 'var(--jade)',    lp: '/home_equity/'   },
  'Consórcio':     { cor: 'var(--bronze)',  lp: '/'               },
  'Imóveis':       { cor: 'var(--abissal)', lp: '/'               }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BLOG_POSTS: window.BLOG_POSTS, BLOG_CATEGORIAS: window.BLOG_CATEGORIAS };
}
