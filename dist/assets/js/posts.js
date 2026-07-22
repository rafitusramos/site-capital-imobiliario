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
  {
    slug: 'melhor-taxa-financiamento-imobiliario-bancos',
    titulo: 'Qual Banco Tem a Melhor Taxa de Financiamento Imobiliário em 2026?',
    categoria: 'Financiamento',
    rotulo: 'Compra · SBPE',
    data: '22-07-2026',
    resumo: 'Caixa a partir de 10,65%, Itaú perto de 11,9% e Santander chegando a 13,29% ao ano. A diferença entre a melhor e a pior taxa no mesmo contrato passa de R$ 170 mil. Um guia direto de taxas, prazos e uso do FGTS.',
    imagem: '/images/blog/melhor-taxa-financiamento.jpg',
    destaque: false
  },
  {
    slug: 'home-equity-empresario-capital-de-giro',
    titulo: 'Home Equity para Empresário: Trocando a Taxa do Capital de Giro pela do Imóvel',
    categoria: 'Home Equity',
    rotulo: 'Garantia de imóvel',
    data: '21-07-2026',
    resumo: 'Capital de giro PJ custa de 30% a 45% ao ano. Com garantia de imóvel, a taxa cai para a faixa de 1,1% a 1,8% ao mês. Como o empresário usa o próprio patrimônio para baratear o crédito da empresa.',
    imagem: '/images/blog/home-equity-empresario.jpg',
    destaque: true
  }
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
